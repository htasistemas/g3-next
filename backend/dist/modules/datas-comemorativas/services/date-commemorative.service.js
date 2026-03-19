import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { dataComemorativaFiltersSchema, dataComemorativaInputSchema } from "../datas-comemorativas.schema.js";
import { mapDataComemorativaToResponse } from "../datas-comemorativas.mapper.js";
import { deduplicateDataComemorativaList } from "../datas-comemorativas.utils.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { CommemorativeImportService } from "./commemorative-import.service.js";
export class DateCommemorativeService {
    repository = new DatasComemorativasRepository();
    importService = new CommemorativeImportService();
    async list(rawFilters) {
        await this.importService.ensureSeedBase();
        const filters = dataComemorativaFiltersSchema.parse(rawFilters ?? {});
        const year = Number(filters.ano ?? new Date().getFullYear()) || new Date().getFullYear();
        const result = await this.repository.listar(filters);
        const eventos = deduplicateDataComemorativaList(result.rows.map((item) => mapDataComemorativaToResponse(item, year)));
        return {
            pagina: Number(filters.pagina ?? 1) || 1,
            limite: Number(filters.limite ?? 20) || 20,
            total: eventos.length,
            eventos
        };
    }
    async create(rawInput, usuarioId) {
        const payload = this.normalizarInput(dataComemorativaInputSchema.parse(rawInput));
        await this.validarDuplicidade(payload);
        const row = await this.repository.criar(payload, this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("CRIACAO", { titulo: row.titulo, tipoEvento: row.tipo_evento }, this.parseOptionalId(usuarioId), row.id);
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async update(rawId, rawInput, usuarioId) {
        const id = this.parseRequiredId(rawId);
        const payload = this.normalizarInput(dataComemorativaInputSchema.parse(rawInput));
        await this.validarDuplicidade(payload, id);
        const row = await this.repository.atualizar(id, payload, this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("EDICAO", { titulo: row.titulo, tipoEvento: row.tipo_evento }, this.parseOptionalId(usuarioId), row.id);
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async deleteLogical(rawId, usuarioId) {
        const id = this.parseRequiredId(rawId);
        await this.repository.excluirLogico(id, this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("EXCLUSAO_LOGICA", { id: rawId }, this.parseOptionalId(usuarioId), id);
    }
    async activate(rawId, usuarioId) {
        const id = this.parseRequiredId(rawId);
        const row = await this.repository.alterarAtivo(id, true, this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("ATIVACAO", { id: rawId }, this.parseOptionalId(usuarioId), id);
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async deactivate(rawId, usuarioId) {
        const id = this.parseRequiredId(rawId);
        const row = await this.repository.alterarAtivo(id, false, this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("INATIVACAO", { id: rawId }, this.parseOptionalId(usuarioId), id);
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async getById(rawId) {
        const row = await this.repository.buscarPorIdOuFalhar(this.parseRequiredId(rawId));
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async getEventsByDate(date, context = {}) {
        await this.importService.ensureSeedBase();
        if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
            throw new AppError("Data invalida.", 400);
        }
        const rows = await this.repository.listarPorData(date, context);
        return {
            data: date,
            eventos: deduplicateDataComemorativaList(rows.map((item) => mapDataComemorativaToResponse(item, Number(date.slice(0, 4)))))
        };
    }
    async getEventsByMonth(year, month, rawFilters, context = {}) {
        await this.importService.ensureSeedBase();
        if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
            throw new AppError("Ano ou mes invalido.", 400);
        }
        const filters = dataComemorativaFiltersSchema.parse(rawFilters ?? {});
        const rows = await this.repository.listarPorMes(year, month, filters, context);
        return deduplicateDataComemorativaList(rows.map((item) => mapDataComemorativaToResponse(item, year)));
    }
    async getCalendarMatrix(year, month, rawFilters, context = {}) {
        const eventos = await this.getEventsByMonth(year, month, rawFilters, context);
        const mapaEventos = new Map();
        for (const evento of eventos) {
            const dia = Number(evento.dataVisual.slice(8, 10));
            const lista = mapaEventos.get(dia) ?? [];
            lista.push(evento);
            mapaEventos.set(dia, lista);
        }
        const firstDay = new Date(year, month - 1, 1);
        const totalDias = new Date(year, month, 0).getDate();
        const deslocamento = (firstDay.getDay() + 6) % 7;
        const weeks = [];
        let currentWeek = [];
        for (let indice = 0; indice < deslocamento; indice += 1) {
            currentWeek.push({ vazio: true });
        }
        for (let dia = 1; dia <= totalDias; dia += 1) {
            currentWeek.push({
                vazio: false,
                dia,
                data: `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
                eventos: mapaEventos.get(dia) ?? []
            });
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        while (currentWeek.length > 0 && currentWeek.length < 7) {
            currentWeek.push({ vazio: true });
        }
        if (currentWeek.length) {
            weeks.push(currentWeek);
        }
        return {
            ano: year,
            mes: month,
            mesLabel: new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric"
            }).format(new Date(year, month - 1, 1)),
            semanaLabels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
            legenda: [
                { tipo: "feriado", label: "Feriados", cor: "#b91c1c" },
                { tipo: "comemorativa", label: "Comemorativas", cor: "#2563eb" },
                { tipo: "interna", label: "Eventos internos", cor: "#0f766e" }
            ],
            weeks
        };
    }
    async duplicate(rawId, usuarioId) {
        const row = await this.repository.duplicar(this.parseRequiredId(rawId), this.parseOptionalId(usuarioId));
        await this.repository.registrarAuditoria("DUPLICACAO", { origemId: rawId, novoTitulo: row.titulo }, this.parseOptionalId(usuarioId), row.id);
        return { evento: mapDataComemorativaToResponse(row) };
    }
    async export(rawFilters, formato) {
        const filters = dataComemorativaFiltersSchema.parse(rawFilters ?? {});
        const rows = await this.repository.listarParaExportacao(filters);
        const eventos = deduplicateDataComemorativaList(rows.map((item) => mapDataComemorativaToResponse(item, Number(filters.ano ?? new Date().getFullYear()))));
        const nomeBase = `datas-comemorativas-${new Date().toISOString().slice(0, 10)}`;
        if (formato === "pdf") {
            return {
                filename: `${nomeBase}.pdf`,
                contentType: "application/pdf",
                buffer: await this.gerarPdf(eventos)
            };
        }
        return {
            filename: `${nomeBase}.csv`,
            contentType: "text/csv; charset=utf-8",
            buffer: Buffer.from(`\uFEFF${this.gerarCsv(eventos)}`, "utf8")
        };
    }
    async validarDuplicidade(input, ignoreId) {
        const duplicado = await this.repository.buscarDuplicidade(input, ignoreId);
        if (duplicado) {
            throw new AppError("Ja existe um evento com essa combinacao logica.", 409);
        }
    }
    normalizarInput(input) {
        const recorrenteAnual = input.recorrenteAnual !== false;
        const ativo = input.ativo !== false;
        if (recorrenteAnual) {
            return {
                ...input,
                dia: Number(input.dia),
                mes: Number(input.mes),
                ano: input.ano ? Number(input.ano) : null,
                dataEvento: null,
                uf: this.normalizarUf(input.uf, input.abrangencia),
                municipio: this.normalizarMunicipio(input.municipio, input.abrangencia),
                exibirNoPopup: ativo ? input.exibirNoPopup !== false : false,
                ativo,
                recorrenteAnual
            };
        }
        const dataEvento = input.dataEvento?.trim();
        if (!dataEvento) {
            throw new AppError("A data do evento e obrigatoria.", 400);
        }
        const [ano, mes, dia] = dataEvento.split("-").map(Number);
        return {
            ...input,
            dia,
            mes,
            ano,
            dataEvento,
            uf: this.normalizarUf(input.uf, input.abrangencia),
            municipio: this.normalizarMunicipio(input.municipio, input.abrangencia),
            exibirNoPopup: ativo ? input.exibirNoPopup !== false : false,
            ativo,
            recorrenteAnual
        };
    }
    normalizarUf(uf, abrangencia) {
        if (abrangencia === "nacional" || abrangencia === "interna") {
            return null;
        }
        return uf?.trim().toUpperCase() ?? null;
    }
    normalizarMunicipio(municipio, abrangencia) {
        if (abrangencia !== "municipal") {
            return null;
        }
        return municipio?.trim() ?? null;
    }
    async gerarPdf(eventos) {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks = [];
        return await new Promise((resolve, reject) => {
            doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.fontSize(16).text("Relatorio de datas comemorativas", { align: "center" });
            doc.moveDown();
            eventos.forEach((evento) => {
                doc
                    .fontSize(11)
                    .text(`${evento.dataVisual} • ${evento.titulo}`, { continued: false })
                    .fontSize(9)
                    .fillColor("#4b5563")
                    .text(`${evento.tipoEvento} • ${evento.abrangencia}${evento.uf ? ` • ${evento.uf}` : ""}${evento.municipio ? ` • ${evento.municipio}` : ""}`)
                    .fillColor("#111827");
                if (evento.descricao) {
                    doc.fontSize(9).text(evento.descricao);
                }
                doc.moveDown(0.6);
            });
            doc.end();
        });
    }
    gerarCsv(eventos) {
        const linhas = [
            [
                "Data",
                "Titulo",
                "Tipo",
                "Abrangencia",
                "UF",
                "Municipio",
                "Recorrente",
                "Ativo",
                "Origem"
            ].join(";")
        ];
        eventos.forEach((evento) => {
            linhas.push([
                evento.dataVisual,
                evento.titulo,
                evento.tipoEvento,
                evento.abrangencia,
                evento.uf ?? "",
                evento.municipio ?? "",
                evento.recorrenteAnual ? "Sim" : "Nao",
                evento.ativo ? "Sim" : "Nao",
                evento.fonteOrigem ?? ""
            ]
                .map((item) => `"${String(item ?? "").replaceAll('"', '""')}"`)
                .join(";"));
        });
        return linhas.join("\n");
    }
    parseRequiredId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseOptionalId(rawId) {
        if (!rawId)
            return undefined;
        return this.parseRequiredId(rawId);
    }
}
