import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { centralAtendimentoInputSchema, centralAtendimentosBuscaFiltersSchema, centralBeneficioInputSchema, centralEncaminhamentoInputSchema } from "../central-atendimentos.schema.js";
import { CentralAtendimentosRepository } from "../repositories/central-atendimentos.repository.js";
export class CentralAtendimentosService {
    repository = new CentralAtendimentosRepository();
    async buscarBeneficiarios(rawFilters, authUser) {
        const filters = centralAtendimentosBuscaFiltersSchema.parse(rawFilters ?? {});
        return this.repository.buscarBeneficiarios(filters, this.parseTenant(authUser));
    }
    async obterVisaoGeral(rawBeneficiarioId, authUser) {
        return this.repository.obterVisaoGeral(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async listarAtendimentos(rawBeneficiarioId, authUser) {
        return this.repository.listarAtendimentos(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async criarAtendimento(rawBeneficiarioId, rawInput, authUser) {
        return this.repository.criarAtendimento(this.parseId(rawBeneficiarioId, "beneficiario"), centralAtendimentoInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async atualizarAtendimento(rawBeneficiarioId, rawAtendimentoId, rawInput, authUser) {
        return this.repository.atualizarAtendimento(this.parseId(rawAtendimentoId, "atendimento"), this.parseId(rawBeneficiarioId, "beneficiario"), centralAtendimentoInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async removerAtendimento(rawBeneficiarioId, rawAtendimentoId, authUser) {
        await this.repository.removerAtendimento(this.parseId(rawAtendimentoId, "atendimento"), this.parseId(rawBeneficiarioId, "beneficiario"), authUser, this.parseTenant(authUser));
    }
    async listarBeneficios(rawBeneficiarioId, authUser) {
        return this.repository.listarBeneficios(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async criarBeneficio(rawBeneficiarioId, rawInput, authUser) {
        return this.repository.criarBeneficio(this.parseId(rawBeneficiarioId, "beneficiario"), centralBeneficioInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async atualizarBeneficio(rawBeneficiarioId, rawBeneficioId, rawInput, authUser) {
        return this.repository.atualizarBeneficio(this.parseId(rawBeneficioId, "beneficio"), this.parseId(rawBeneficiarioId, "beneficiario"), centralBeneficioInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async removerBeneficio(rawBeneficiarioId, rawBeneficioId, authUser) {
        await this.repository.removerBeneficio(this.parseId(rawBeneficioId, "beneficio"), this.parseId(rawBeneficiarioId, "beneficiario"), authUser, this.parseTenant(authUser));
    }
    async listarEncaminhamentos(rawBeneficiarioId, authUser) {
        return this.repository.listarEncaminhamentos(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async criarEncaminhamento(rawBeneficiarioId, rawInput, authUser) {
        return this.repository.criarEncaminhamento(this.parseId(rawBeneficiarioId, "beneficiario"), centralEncaminhamentoInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async atualizarEncaminhamento(rawBeneficiarioId, rawEncaminhamentoId, rawInput, authUser) {
        return this.repository.atualizarEncaminhamento(this.parseId(rawEncaminhamentoId, "encaminhamento"), this.parseId(rawBeneficiarioId, "beneficiario"), centralEncaminhamentoInputSchema.parse(rawInput), authUser, this.parseTenant(authUser));
    }
    async removerEncaminhamento(rawBeneficiarioId, rawEncaminhamentoId, authUser) {
        await this.repository.removerEncaminhamento(this.parseId(rawEncaminhamentoId, "encaminhamento"), this.parseId(rawBeneficiarioId, "beneficiario"), authUser, this.parseTenant(authUser));
    }
    async listarHistorico(rawBeneficiarioId, authUser) {
        return this.repository.listarHistorico(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async listarCustos(rawBeneficiarioId, authUser) {
        return this.repository.listarCustos(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async listarGrupoFamiliar(rawBeneficiarioId, authUser) {
        return this.repository.listarGrupoFamiliar(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async listarAlertas(rawBeneficiarioId, authUser) {
        return this.repository.listarAlertas(this.parseId(rawBeneficiarioId, "beneficiario"), this.parseTenant(authUser));
    }
    async gerarRelatorio(rawBeneficiarioId, rawTipo, authUser) {
        const tipo = this.parseTipoRelatorio(rawTipo);
        return this.repository.gerarRelatorio(this.parseId(rawBeneficiarioId, "beneficiario"), tipo, this.parseTenant(authUser));
    }
    async gerarRelatorioPdf(rawBeneficiarioId, rawTipo, authUser) {
        const tipo = this.parseTipoRelatorio(rawTipo);
        const beneficiarioId = this.parseId(rawBeneficiarioId, "beneficiario");
        const tenantId = this.parseTenant(authUser);
        const visao = await this.repository.obterVisaoGeral(beneficiarioId, tenantId);
        const relatorio = await this.repository.gerarRelatorio(beneficiarioId, tipo, tenantId);
        return this.renderizarPdf(visao.beneficiario.nomeCompleto, relatorio, tipo);
    }
    renderizarPdf(nomeBeneficiario, relatorio, tipo) {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers = [];
        return new Promise((resolve, reject) => {
            doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
            doc.on("end", () => {
                resolve({
                    nomeArquivo: `Central-atendimentos-${this.slugificar(nomeBeneficiario || "beneficiario")}-${tipo}.pdf`,
                    buffer: Buffer.concat(buffers)
                });
            });
            doc.on("error", reject);
            doc.fontSize(18).text("Central de atendimentos", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(11).fillColor("#475569").text(`Relatorio: ${this.nomeRelatorio(tipo)}`, { align: "center" });
            doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" });
            doc.moveDown(1.5);
            doc.fillColor("#0f172a");
            const linhas = this.gerarLinhasRelatorio(relatorio);
            linhas.forEach((linha) => {
                if (linha.tipo === "titulo") {
                    doc.moveDown(0.8);
                    doc.fontSize(13).fillColor("#0f766e").text(linha.texto);
                    doc.moveDown(0.2);
                    doc.fillColor("#0f172a");
                    return;
                }
                doc.fontSize(10.5).text(linha.texto || "-", {
                    width: doc.page.width - doc.page.margins.left - doc.page.margins.right
                });
            });
            doc.end();
        });
    }
    gerarLinhasRelatorio(relatorio) {
        const linhas = [];
        const visitar = (valor, chave) => {
            if (valor === null || valor === undefined || valor === "")
                return;
            if (Array.isArray(valor)) {
                if (!valor.length)
                    return;
                if (chave)
                    linhas.push({ tipo: "titulo", texto: this.humanizarChave(chave) });
                valor.forEach((item, index) => {
                    if (typeof item === "object" && item !== null) {
                        linhas.push({ tipo: "texto", texto: `${index + 1}.` });
                        visitar(item);
                    }
                    else {
                        linhas.push({ tipo: "texto", texto: `• ${String(item)}` });
                    }
                });
                return;
            }
            if (typeof valor === "object") {
                const entries = Object.entries(valor);
                if (!entries.length)
                    return;
                if (chave)
                    linhas.push({ tipo: "titulo", texto: this.humanizarChave(chave) });
                entries.forEach(([entryKey, entryValue]) => visitar(entryValue, entryKey));
                return;
            }
            const prefixo = chave ? `${this.humanizarChave(chave)}: ` : "";
            linhas.push({ tipo: "texto", texto: `${prefixo}${String(valor)}` });
        };
        visitar(relatorio);
        return linhas;
    }
    parseTipoRelatorio(rawTipo) {
        const tipo = rawTipo.trim();
        if (!["individual", "familiar", "financeiro-social", "social"].includes(tipo)) {
            throw new AppError("Tipo de relatorio invalido.", 400);
        }
        return tipo;
    }
    parseId(rawId, label) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError(`Identificador de ${label} invalido.`, 400);
        }
        return BigInt(id);
    }
    parseTenant(authUser) {
        const tenantId = authUser?.tenant_id?.trim();
        const instituicaoId = authUser?.instituicao_id?.trim();
        if (!tenantId || !instituicaoId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    nomeRelatorio(tipo) {
        if (tipo === "financeiro-social")
            return "Financeiro-social";
        if (tipo === "social")
            return "Social";
        if (tipo === "familiar")
            return "Familiar";
        return "Individual";
    }
    humanizarChave(chave) {
        return chave
            .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
            .replaceAll("_", " ")
            .replaceAll("-", " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^./, (letra) => letra.toUpperCase());
    }
    slugificar(valor) {
        return valor
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase();
    }
}
