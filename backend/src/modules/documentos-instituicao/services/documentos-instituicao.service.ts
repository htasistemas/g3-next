import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDocumentosInstituicao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapDocumentoInstituicaoAnexoToResponse,
  mapDocumentoInstituicaoHistoricoToResponse,
  mapDocumentoInstituicaoToResponse
} from "../documentos-instituicao.mapper.js";
import {
  documentoInstituicaoAnexoInputSchema,
  documentoInstituicaoHistoricoInputSchema,
  documentoInstituicaoInputSchema
} from "../documentos-instituicao.schema.js";
import { DocumentosInstituicaoRepository } from "../repositories/documentos-instituicao.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class DocumentosInstituicaoService {
  private readonly repository = new DocumentosInstituicaoRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map(mapDocumentoInstituicaoToResponse);
  }

  async criar(rawInput: unknown) {
    const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    return mapDocumentoInstituicaoToResponse(registro);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = documentoInstituicaoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    return mapDocumentoInstituicaoToResponse(registro);
  }

  async excluir(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.excluir(id);
  }

  async listarAnexos(rawDocumentoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexos = await this.repository.listarAnexos(documentoId);
    return anexos.map(mapDocumentoInstituicaoAnexoToResponse);
  }

  async adicionarAnexo(rawDocumentoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const input = documentoInstituicaoAnexoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseIdOpcional(rawUsuarioId);
    const arquivo = await storageService.salvarArquivo({
      scope: "instituicao_documento",
      conteudo: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: documentoId,
      usuarioUploadId: usuarioId,
      observacao: input.tipo
    });

    try {
      const anexo = await this.repository.adicionarAnexo(documentoId, {
        ...input,
        conteudoBase64: arquivo.caminhoArquivo,
        nomeArquivo: input.nomeArquivo || arquivo.registro.nome_original,
        tipoMime: input.tipoMime || arquivo.registro.mime_type
      });
      return mapDocumentoInstituicaoAnexoToResponse(anexo);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
      throw error;
    }
  }

  async obterArquivoAnexo(rawDocumentoId: string, rawAnexoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const anexoId = this.parseId(rawAnexoId);
    const anexo = await this.repository.buscarAnexoPorIdOuFalhar(documentoId, anexoId);
    if (!anexo.caminho_arquivo) {
      throw new AppError("Anexo sem arquivo armazenado.", 404);
    }
    return anexo.caminho_arquivo;
  }

  async listarHistorico(rawDocumentoId: string) {
    const documentoId = this.parseId(rawDocumentoId);
    const historico = await this.repository.listarHistorico(documentoId);
    return historico.map(mapDocumentoInstituicaoHistoricoToResponse);
  }

  async adicionarHistorico(rawDocumentoId: string, rawInput: unknown) {
    const documentoId = this.parseId(rawDocumentoId);
    const input = documentoInstituicaoHistoricoInputSchema.parse(
      this.normalizarPayload(rawInput)
    );
    const historico = await this.repository.adicionarHistorico(documentoId, input);
    return mapDocumentoInstituicaoHistoricoToResponse(historico);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private parseIdOpcional(rawId?: string) {
    if (!rawId) return undefined;
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoDocumentosInstituicao
    );
  }
}
