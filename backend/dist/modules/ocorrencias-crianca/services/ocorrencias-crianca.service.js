import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapOcorrenciaCriancaAnexoRowToResponse, mapOcorrenciaCriancaRowToResponse } from "../ocorrencias-crianca.mapper.js";
import { ocorrenciaCriancaAnexoInputSchema, ocorrenciaCriancaInputSchema } from "../ocorrencias-crianca.schema.js";
import { OcorrenciasCriancaRepository } from "../repositories/ocorrencias-crianca.repository.js";
export class OcorrenciasCriancaService {
    repository = new OcorrenciasCriancaRepository();
    async listar() {
        const rows = await this.repository.listar();
        return rows.map(mapOcorrenciaCriancaRowToResponse);
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const row = await this.repository.obterOuFalhar(id);
        return mapOcorrenciaCriancaRowToResponse(row);
    }
    async criar(rawInput) {
        const input = ocorrenciaCriancaInputSchema.parse(rawInput);
        const row = await this.repository.criar(input);
        return mapOcorrenciaCriancaRowToResponse(row);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = ocorrenciaCriancaInputSchema.parse(rawInput);
        const row = await this.repository.atualizar(id, input);
        return mapOcorrenciaCriancaRowToResponse(row);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async listarAnexos(rawId) {
        const id = this.parseId(rawId);
        const rows = await this.repository.listarAnexos(id);
        return rows.map(mapOcorrenciaCriancaAnexoRowToResponse);
    }
    async adicionarAnexo(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = ocorrenciaCriancaAnexoInputSchema.parse(rawInput);
        const row = await this.repository.adicionarAnexo(id, input);
        return mapOcorrenciaCriancaAnexoRowToResponse(row);
    }
    async removerAnexo(rawId, rawAnexoId) {
        const id = this.parseId(rawId);
        const anexoId = this.parseId(rawAnexoId);
        await this.repository.removerAnexo(id, anexoId);
    }
    async gerarPdfDenuncia(rawId) {
        const id = this.parseId(rawId);
        const row = await this.repository.obterOuFalhar(id);
        const payload = mapOcorrenciaCriancaRowToResponse(row);
        return this.gerarPdf(`Ocorrencia-${String(payload.id ?? "")}-Denuncia.pdf`, [
            "Relatorio de Ocorrencia - Denuncia",
            `Codigo: ${String(payload.id ?? "")}`,
            `Data: ${String(payload.dataPreenchimento ?? "")}`,
            `Vitima: ${String(payload.vitimaNome ?? "")}`,
            `Resumo: ${String(payload.resumoViolencia ?? "")}`
        ]);
    }
    async gerarPdfConselhoTutelar(rawId) {
        const id = this.parseId(rawId);
        const row = await this.repository.obterOuFalhar(id);
        const payload = mapOcorrenciaCriancaRowToResponse(row);
        return this.gerarPdf(`Ocorrencia-${String(payload.id ?? "")}-ConselhoTutelar.pdf`, [
            "Relatorio de Encaminhamento ao Conselho Tutelar",
            `Codigo: ${String(payload.id ?? "")}`,
            `Data: ${String(payload.dataPreenchimento ?? "")}`,
            `Vitima: ${String(payload.vitimaNome ?? "")}`,
            `Resumo: ${String(payload.resumoViolencia ?? "")}`,
            `Encaminhar conselho: ${String(payload.encaminharConselho ?? "Nao informado")}`
        ]);
    }
    gerarPdf(nomeArquivo, linhas) {
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const buffers = [];
        return new Promise((resolve, reject) => {
            doc.on("data", (chunk) => buffers.push(Buffer.from(chunk)));
            doc.on("end", () => resolve({ nomeArquivo, buffer: Buffer.concat(buffers) }));
            doc.on("error", reject);
            doc.fontSize(16).text(linhas[0] ?? "Relatorio", { align: "center" });
            doc.moveDown(1);
            doc.fontSize(11);
            for (const linha of linhas.slice(1)) {
                doc.text(linha || "-");
            }
            doc.end();
        });
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
