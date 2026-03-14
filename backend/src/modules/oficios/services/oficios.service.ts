import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoOficios } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapOficioImagemToResponse, mapOficioToResponse } from "../oficios.mapper.js";
import {
  oficioImagemInputSchema,
  oficioInputSchema,
  oficioPdfAssinadoInputSchema
} from "../oficios.schema.js";
import { OficiosRepository } from "../repositories/oficios.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class OficiosService {
  private readonly repository = new OficiosRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map((item) => mapOficioToResponse(item.oficio, item.tramites));
  }

  async obter(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async criar(rawInput: unknown) {
    const input = oficioInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = oficioInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    return mapOficioToResponse(registro.oficio, registro.tramites);
  }

  async remover(rawId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    const imagens = await this.repository.listarImagens(id);
    await this.repository.remover(id);
    await this.limparArquivo(registro.oficio.pdf_assinado_conteudo, usuarioId);
    for (const imagem of imagens) {
      await this.limparArquivo(imagem.conteudo_base64, usuarioId);
    }
  }

  async salvarPdfAssinado(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const input = oficioPdfAssinadoInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    const arquivo = await storageService.salvarArquivo({
      scope: "oficio_documento",
      conteudo: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: id,
      usuarioUploadId: usuarioId,
      observacao: "PDF assinado do oficio"
    });

    try {
      const registro = await this.repository.salvarPdfAssinado(id, {
        ...input,
        conteudoBase64: arquivo.caminhoArquivo,
        tipoMime: arquivo.registro.mime_type
      });
      await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
      await this.limparArquivo(existente.oficio.pdf_assinado_conteudo, usuarioId, arquivo.caminhoArquivo);
      return mapOficioToResponse(registro.oficio, registro.tramites);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
      throw error;
    }
  }

  async obterPdfAssinado(rawId: string) {
    const id = this.parseId(rawId);
    const pdf = await this.repository.obterPdfAssinado(id);
    if (!pdf.nome || !pdf.tipo || !pdf.conteudo) {
      throw new AppError("Oficio nao possui PDF assinado.", 404);
    }
    return pdf;
  }

  async removerPdfAssinado(rawId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const pdf = await this.repository.obterPdfAssinado(id);
    await this.repository.removerPdfAssinado(id);
    await this.limparArquivo(pdf.conteudo, usuarioId);
  }

  async listarImagens(rawId: string) {
    const id = this.parseId(rawId);
    const imagens = await this.repository.listarImagens(id);
    return imagens.map(mapOficioImagemToResponse);
  }

  async adicionarImagem(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const input = oficioImagemInputSchema.parse(this.normalizarPayload(rawInput));
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const arquivo = await storageService.salvarArquivo({
      scope: "oficio_documento",
      conteudo: input.conteudoBase64,
      nomeOriginal: input.nomeArquivo,
      mimeType: input.tipoMime,
      entidadeId: id,
      usuarioUploadId: usuarioId,
      observacao: "Imagem do oficio"
    });

    try {
      const imagem = await this.repository.adicionarImagem(id, {
        ...input,
        conteudoBase64: arquivo.caminhoArquivo,
        tipoMime: arquivo.registro.mime_type
      });
      await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
      return mapOficioImagemToResponse(imagem);
    } catch (error) {
      await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
      throw error;
    }
  }

  async removerImagem(rawId: string, rawImagemId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const imagemId = this.parseId(rawImagemId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const imagens = await this.repository.listarImagens(id);
    const imagem = imagens.find((item) => item.id === imagemId);
    await this.repository.removerImagem(id, imagemId);
    await this.limparArquivo(imagem?.conteudo_base64, usuarioId);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(rawInput as Record<string, unknown>, mapaCamposTextoOficios);
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
  }

  private async limparArquivo(valor?: string | null, usuarioId?: bigint, ignorarCaminho?: string) {
    if (!this.isManagedStoragePath(valor)) {
      return;
    }

    if (valor === ignorarCaminho) {
      return;
    }

    await storageService.desativarPorCaminho(valor, usuarioId);
  }

  private parseUsuarioId(rawUsuarioId?: string) {
    if (!rawUsuarioId) return undefined;
    const parsed = Number(rawUsuarioId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return BigInt(parsed);
  }
}
