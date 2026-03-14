import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapOcorrenciaCriancaAnexoRowToResponse, mapOcorrenciaCriancaRowToResponse } from "../ocorrencias-crianca.mapper.js";
import { ocorrenciaCriancaAnexoInputSchema, ocorrenciaCriancaInputSchema } from "../ocorrencias-crianca.schema.js";
import { OcorrenciasCriancaRepository } from "../repositories/ocorrencias-crianca.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
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
    async adicionarAnexo(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const input = ocorrenciaCriancaAnexoInputSchema.parse(rawInput);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const arquivo = await storageService.salvarArquivo({
            scope: "ocorrencia_anexo",
            conteudo: input.conteudoBase64,
            nomeOriginal: input.nomeArquivo,
            mimeType: input.tipoMime,
            entidadeId: id,
            usuarioUploadId: usuarioId,
            observacao: "Anexo de ocorrencia"
        });
        try {
            const row = await this.repository.adicionarAnexo(id, {
                ...input,
                conteudoBase64: arquivo.caminhoArquivo,
                tipoMime: arquivo.registro.mime_type
            });
            return mapOcorrenciaCriancaAnexoRowToResponse(row);
        }
        catch (error) {
            await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
            throw error;
        }
    }
    async removerAnexo(rawId, rawAnexoId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const anexoId = this.parseId(rawAnexoId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const anexos = await this.repository.listarAnexos(id);
        const anexo = anexos.find((item) => item.id === anexoId);
        await this.repository.removerAnexo(id, anexoId);
        if (this.isManagedStoragePath(anexo?.conteudo_base64)) {
            await storageService.desativarPorCaminho(anexo?.conteudo_base64, usuarioId);
        }
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
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
    parseUsuarioId(rawUsuarioId) {
        if (!rawUsuarioId)
            return undefined;
        const parsed = Number(rawUsuarioId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return BigInt(parsed);
    }
}
