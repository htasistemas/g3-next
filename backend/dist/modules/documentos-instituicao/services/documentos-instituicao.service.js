import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDocumentosInstituicao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapDocumentoInstituicaoAnexoToResponse, mapDocumentoInstituicaoHistoricoToResponse, mapDocumentoInstituicaoToResponse } from "../documentos-instituicao.mapper.js";
import { documentoInstituicaoAnexoInputSchema, documentoInstituicaoHistoricoInputSchema, documentoInstituicaoInputSchema } from "../documentos-instituicao.schema.js";
import { DocumentosInstituicaoRepository } from "../repositories/documentos-instituicao.repository.js";
export class DocumentosInstituicaoService {
    repository = new DocumentosInstituicaoRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map(mapDocumentoInstituicaoToResponse);
    }
    async criar(rawInput) {
        const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapDocumentoInstituicaoToResponse(registro);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapDocumentoInstituicaoToResponse(registro);
    }
    async excluir(rawId) {
        const id = this.parseId(rawId);
        await this.repository.excluir(id);
    }
    async listarAnexos(rawDocumentoId) {
        const documentoId = this.parseId(rawDocumentoId);
        const anexos = await this.repository.listarAnexos(documentoId);
        return anexos.map(mapDocumentoInstituicaoAnexoToResponse);
    }
    async adicionarAnexo(rawDocumentoId, rawInput) {
        const documentoId = this.parseId(rawDocumentoId);
        const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
        const anexo = await this.repository.adicionarAnexo(documentoId, input);
        return mapDocumentoInstituicaoAnexoToResponse(anexo);
    }
    async obterArquivoAnexo(rawDocumentoId, rawAnexoId) {
        const documentoId = this.parseId(rawDocumentoId);
        const anexoId = this.parseId(rawAnexoId);
        const anexo = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId);
        if (!anexo.caminho_arquivo) {
            throw new AppError("Anexo sem arquivo armazenado.", 404);
        }
        return anexo.caminho_arquivo;
    }
    async listarHistorico(rawDocumentoId) {
        const documentoId = this.parseId(rawDocumentoId);
        const historico = await this.repository.listarHistorico(documentoId);
        return historico.map(mapDocumentoInstituicaoHistoricoToResponse);
    }
    async adicionarHistorico(rawDocumentoId, rawInput) {
        const documentoId = this.parseId(rawDocumentoId);
        const input = documentoInstituicaoHistoricoInputSchema.parse(this.normalizarPayload(rawInput));
        const historico = await this.repository.adicionarHistorico(documentoId, input);
        return mapDocumentoInstituicaoHistoricoToResponse(historico);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoDocumentosInstituicao);
    }
}
