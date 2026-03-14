import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoContratacao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapArquivo,
  mapAuditoria,
  mapCandidatoDetalhe,
  mapCartaBanco,
  mapDocumento,
  mapEntrevista,
  mapFicha,
  mapPpd,
  mapProcesso,
  mapResumoCandidato,
  mapTermo
} from "../rh-contratacao.mapper.js";
import {
  rhArquivoInputSchema,
  rhCandidatoInputSchema,
  rhCartaBancoInputSchema,
  rhDocumentoInputSchema,
  rhEntrevistaInputSchema,
  rhFichaInputSchema,
  rhPpdInputSchema,
  rhStatusProcessoInputSchema,
  rhTermoInputSchema
} from "../rh-contratacao.schema.js";
import { RhContratacaoRepository } from "../repositories/rh-contratacao.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class RhContratacaoService {
  private readonly repository = new RhContratacaoRepository();

  async listarCandidatos(termo?: string) {
    const rows = await this.repository.listarCandidatos(termo);
    return rows.map(mapResumoCandidato);
  }

  async buscarCandidato(rawId: string) {
    const id = this.parseId(rawId);
    const candidato = await this.repository.buscarCandidatoOuFalhar(id);
    return mapCandidatoDetalhe(candidato);
  }

  async criarCandidato(rawInput: unknown, rawUsuarioId?: string) {
    const input = rhCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const processo = await this.repository.criarCandidato(input, usuarioId);
    if (!processo) throw new AppError("Nao foi possivel criar processo de contratacao.", 500);
    return mapProcesso(processo);
  }

  async atualizarCandidato(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const input = rhCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const processo = await this.repository.atualizarCandidato(id, input, usuarioId);
    if (!processo) throw new AppError("Processo nao encontrado para o candidato.", 404);
    return mapProcesso(processo);
  }

  async inativarCandidato(rawId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    await this.repository.inativarCandidato(id, usuarioId);
  }

  async buscarProcessoPorCandidato(rawCandidatoId: string) {
    const candidatoId = this.parseId(rawCandidatoId);
    const processo = await this.repository.buscarProcessoPorCandidato(candidatoId);
    if (!processo) throw new AppError("Processo de contratacao nao encontrado.", 404);
    return mapProcesso(processo);
  }

  async atualizarStatus(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const { status } = rhStatusProcessoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const processo = await this.repository.atualizarStatusProcesso(processoId, status, usuarioId);
    return mapProcesso(processo);
  }

  async listarEntrevistas(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const rows = await this.repository.listarEntrevistas(processoId);
    return rows.map(mapEntrevista);
  }

  async salvarEntrevista(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhEntrevistaInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.salvarEntrevista(processoId, input, usuarioId);
    return mapEntrevista(row);
  }

  async buscarFicha(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const row = await this.repository.buscarFicha(processoId);
    return mapFicha(row);
  }

  async salvarFicha(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhFichaInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.salvarFicha(processoId, input, usuarioId);
    return mapFicha(row);
  }

  async listarDocumentos(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const rows = await this.repository.listarDocumentos(processoId);
    return rows.map(mapDocumento);
  }

  async atualizarDocumento(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const input = rhDocumentoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.atualizarDocumento(id, input, usuarioId);
    if (!row) throw new AppError("Documento de contratacao nao encontrado.", 404);
    return mapDocumento(row);
  }

  async listarArquivos(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const rows = await this.repository.listarArquivos(processoId);
    return rows.map(mapArquivo);
  }

  async adicionarArquivo(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhArquivoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    if (input.conteudoBase64) {
      const arquivo = await storageService.salvarArquivo({
        scope: "colaborador_documento",
        conteudo: input.conteudoBase64,
        nomeOriginal: input.nomeArquivo,
        mimeType: input.mimeType,
        entidadeId: processoId,
        entidadeTipo: "colaborador",
        usuarioUploadId: usuarioId ?? undefined,
        observacao: input.categoria
      });

      try {
        const row = await this.repository.adicionarArquivo(
          processoId,
          {
            ...input,
            caminhoArquivo: arquivo.caminhoArquivo,
            conteudoBase64: null,
            mimeType: arquivo.registro.mime_type,
            tamanhoBytes: Number(arquivo.registro.tamanho_bytes)
          },
          usuarioId
        );
        await storageService.vincularEntidade(arquivo.caminhoArquivo, processoId);
        return mapArquivo(row);
      } catch (error) {
        await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
        throw error;
      }
    }

    const row = await this.repository.adicionarArquivo(processoId, input, usuarioId);
    return mapArquivo(row);
  }

  async listarTermos(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const rows = await this.repository.listarTermos(processoId);
    return rows.map(mapTermo);
  }

  async salvarTermo(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhTermoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.salvarTermo(processoId, input, usuarioId);
    return mapTermo(row);
  }

  async buscarPpd(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const row = await this.repository.buscarPpd(processoId);
    return mapPpd(row);
  }

  async salvarPpd(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhPpdInputSchema.parse(rawInput);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.salvarPpd(processoId, input, usuarioId);
    return mapPpd(row);
  }

  async buscarCartaBanco(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const row = await this.repository.buscarCartaBanco(processoId);
    return mapCartaBanco(row);
  }

  async salvarCartaBanco(rawProcessoId: string, rawInput: unknown, rawUsuarioId?: string) {
    const processoId = this.parseId(rawProcessoId);
    const input = rhCartaBancoInputSchema.parse(rawInput);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const row = await this.repository.salvarCartaBanco(processoId, input, usuarioId);
    return mapCartaBanco(row);
  }

  async listarAuditoria(rawProcessoId: string) {
    const processoId = this.parseId(rawProcessoId);
    const rows = await this.repository.listarAuditoria(processoId);
    return rows.map(mapAuditoria);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private parseOptionalId(rawId?: string) {
    if (!rawId) return null;
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoContratacao
    );
  }
}
