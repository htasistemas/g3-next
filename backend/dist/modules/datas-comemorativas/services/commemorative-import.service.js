import { AppError } from "../../../shared/errors/app-error.js";
import { datasComemorativasSeed } from "../datas-comemorativas.seed.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { ProviderFactory } from "../providers/provider-factory.js";
export class CommemorativeImportService {
    repository = new DatasComemorativasRepository();
    providerFactory = new ProviderFactory();
    async ensureSeedBase(usuarioId) {
        let existentes = await this.repository.listar({
            origem: "seed",
            pagina: "1",
            limite: "5000"
        });
        const possuiRegistrosCorrompidos = existentes.rows.some((item) => /Ã|Â|�/u.test(item.titulo));
        if (possuiRegistrosCorrompidos) {
            await this.repository.removerSeedCorrompido();
            existentes = await this.repository.listar({
                origem: "seed",
                pagina: "1",
                limite: "5000"
            });
        }
        const totalDuplicidadesRemovidas = await this.repository.removerDuplicidadesLogicas();
        if (totalDuplicidadesRemovidas > 0) {
            existentes = await this.repository.listar({
                origem: "seed",
                pagina: "1",
                limite: "5000"
            });
        }
        const chavesExistentes = new Set(existentes.rows.map((item) => `${item.titulo.trim().toLowerCase()}|${item.dia}|${item.mes}|${item.tipo_evento}|${item.abrangencia}`));
        const faltantes = datasComemorativasSeed.filter((item) => {
            const chave = `${item.titulo.trim().toLowerCase()}|${item.dia ?? 0}|${item.mes ?? 0}|${item.tipoEvento}|${item.abrangencia}`;
            return !chavesExistentes.has(chave);
        });
        if (!faltantes.length && !possuiRegistrosCorrompidos && totalDuplicidadesRemovidas === 0) {
            return {
                origem: "seed",
                lidos: datasComemorativasSeed.length,
                inseridos: 0,
                atualizados: 0,
                ignorados: datasComemorativasSeed.length,
                erros: 0
            };
        }
        return this.upsertBatch(datasComemorativasSeed, "seed", usuarioId);
    }
    async importFromSeed(usuarioId) {
        return this.upsertBatch(datasComemorativasSeed, "seed", usuarioId);
    }
    async importFromJson(conteudo, usuarioId) {
        let parsed;
        try {
            parsed = JSON.parse(conteudo);
        }
        catch {
            throw new AppError("Arquivo JSON invalido.", 400);
        }
        const itens = Array.isArray(parsed) ? parsed : [];
        return this.upsertBatch(itens.map((item) => this.normalizarItem(item)), "importacao_json", usuarioId);
    }
    async importFromCsv(conteudo, usuarioId) {
        const linhas = conteudo
            .replace(/^\uFEFF/u, "")
            .split(/\r?\n/u)
            .map((linha) => linha.trim())
            .filter(Boolean);
        if (linhas.length < 2) {
            throw new AppError("Arquivo CSV sem registros para importar.", 400);
        }
        const cabecalho = linhas[0]?.split(";").map((coluna) => coluna.trim().toLowerCase()) ?? [];
        const itens = linhas.slice(1).map((linha) => {
            const colunas = linha.split(";").map((coluna) => coluna.trim());
            const registro = cabecalho.reduce((acc, chave, indice) => {
                acc[chave] = colunas[indice] ?? "";
                return acc;
            }, {});
            return this.normalizarItem(registro);
        });
        return this.upsertBatch(itens, "importacao_csv", usuarioId);
    }
    async importar(rawInput, usuarioId) {
        const payload = (rawInput ?? {});
        const formato = String(payload.formato ?? "seed").trim().toLowerCase();
        if (formato === "seed") {
            return this.importFromSeed(usuarioId);
        }
        if (formato === "json") {
            return this.importFromJson(String(payload.conteudo ?? ""), usuarioId);
        }
        if (formato === "csv") {
            return this.importFromCsv(String(payload.conteudo ?? ""), usuarioId);
        }
        if (formato === "provider") {
            const ano = Number(payload.ano ?? new Date().getFullYear());
            const provider = this.providerFactory.getCommemorativeProvider(payload.provider);
            const itens = payload.mes
                ? await provider.importByMonth(ano, Number(payload.mes))
                : await provider.importByYear(ano);
            return this.upsertBatch(itens, provider.getProviderName(), usuarioId);
        }
        throw new AppError("Formato de importacao invalido.", 400);
    }
    async upsertBatch(items, source, usuarioId) {
        const logId = await this.repository.iniciarSyncLog({
            providerNome: source,
            tipoSync: "datas_comemorativas",
            parametrosExecucao: { quantidade: items.length },
            executadoPor: this.parseId(usuarioId) ?? null
        });
        const counters = {
            lidos: items.length,
            inseridos: 0,
            atualizados: 0,
            ignorados: 0,
            erros: 0
        };
        try {
            for (const item of items) {
                try {
                    const resultado = await this.repository.salvarImportado({
                        ...item,
                        fonteOrigem: item.fonteOrigem ?? source
                    }, this.parseId(usuarioId) ?? null);
                    if (resultado.acao === "inserido") {
                        counters.inseridos += 1;
                    }
                    else {
                        counters.atualizados += 1;
                    }
                }
                catch {
                    counters.erros += 1;
                }
            }
            await this.repository.finalizarSyncLog({
                logId,
                quantidadeLidos: counters.lidos,
                quantidadeInseridos: counters.inseridos,
                quantidadeAtualizados: counters.atualizados,
                quantidadeIgnorados: counters.ignorados,
                quantidadeErros: counters.erros,
                statusExecucao: counters.erros > 0 ? "parcial" : "sucesso"
            });
            await this.repository.registrarAuditoria("IMPORTACAO_DATAS", { origem: source, ...counters }, this.parseId(usuarioId));
            return {
                origem: source,
                ...counters
            };
        }
        catch (error) {
            await this.repository.finalizarSyncLog({
                logId,
                quantidadeLidos: counters.lidos,
                quantidadeInseridos: counters.inseridos,
                quantidadeAtualizados: counters.atualizados,
                quantidadeIgnorados: counters.ignorados,
                quantidadeErros: counters.erros + 1,
                statusExecucao: "erro",
                detalhesErro: error instanceof Error ? error.message : "Falha ao importar datas."
            });
            throw error;
        }
    }
    normalizarItem(item) {
        const registro = (item ?? {});
        const dataEvento = this.toOptionalString(registro.dataEvento ?? registro.data_evento);
        const tipoEvento = this.toTipoEvento(registro.tipoEvento ?? registro.tipo_evento);
        const abrangencia = this.toAbrangencia(registro.abrangencia);
        const dia = this.toOptionalNumber(registro.dia);
        const mes = this.toOptionalNumber(registro.mes);
        const ano = this.toOptionalNumber(registro.ano);
        if (!this.toOptionalString(registro.titulo)) {
            throw new AppError("Todo item importado precisa ter titulo.", 400);
        }
        const recorrenteAnual = this.toBoolean(registro.recorrenteAnual ?? registro.recorrente_anual, true);
        return {
            titulo: String(registro.titulo).trim(),
            descricao: this.toOptionalString(registro.descricao),
            dia: dia ?? (dataEvento ? Number(dataEvento.slice(8, 10)) : null),
            mes: mes ?? (dataEvento ? Number(dataEvento.slice(5, 7)) : null),
            ano: ano ?? (dataEvento ? Number(dataEvento.slice(0, 4)) : null),
            dataEvento,
            tipoEvento,
            abrangencia,
            uf: this.toOptionalString(registro.uf),
            municipio: this.toOptionalString(registro.municipio),
            recorrenteAnual,
            fonteOrigem: this.toOptionalString(registro.fonteOrigem ?? registro.fonte_origem) ?? "importacao",
            origemReferencia: this.toOptionalString(registro.origemReferencia ?? registro.origem_referencia),
            corExibicao: this.toOptionalString(registro.corExibicao ?? registro.cor_exibicao),
            icone: this.toOptionalString(registro.icone),
            prioridadePopup: this.toOptionalNumber(registro.prioridadePopup ?? registro.prioridade_popup) ?? 0,
            exibirNoPopup: this.toBoolean(registro.exibirNoPopup ?? registro.exibir_no_popup, true),
            ativo: this.toBoolean(registro.ativo, true)
        };
    }
    toOptionalString(value) {
        if (typeof value !== "string")
            return undefined;
        const normalized = value.trim();
        return normalized.length ? normalized : undefined;
    }
    toOptionalNumber(value) {
        if (value === null || value === undefined || value === "")
            return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    toBoolean(value, fallback) {
        if (typeof value === "boolean")
            return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (["true", "1", "sim", "yes"].includes(normalized))
                return true;
            if (["false", "0", "nao", "não", "no"].includes(normalized))
                return false;
        }
        return fallback;
    }
    toTipoEvento(value) {
        const normalized = String(value ?? "comemorativa").trim().toLowerCase();
        if (normalized === "feriado_nacional" ||
            normalized === "feriado_estadual" ||
            normalized === "feriado_municipal" ||
            normalized === "institucional" ||
            normalized === "personalizado") {
            return normalized;
        }
        return "comemorativa";
    }
    toAbrangencia(value) {
        const normalized = String(value ?? "nacional").trim().toLowerCase();
        if (normalized === "estadual" || normalized === "municipal" || normalized === "interna") {
            return normalized;
        }
        return "nacional";
    }
    parseId(value) {
        if (!value)
            return undefined;
        return BigInt(value);
    }
}
