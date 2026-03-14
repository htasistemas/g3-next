import { AppError } from "../../../shared/errors/app-error.js";
import {
  profissionalFiltersSchema,
  profissionalInputSchema
} from "../profissional.schema.js";
import { mapProfissionalToResponse } from "../profissional.mapper.js";
import { ProfissionalRepository } from "../repositories/profissional.repository.js";
import { mapaCamposTextoProfissional } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class ProfissionalService {
  private readonly repository = new ProfissionalRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "nomePessoa",
              categoria: "instituicao",
              status: "textoCurto",
              vinculo: "textoCurto"
            }
          )
        : rawFilters;

    const filters = profissionalFiltersSchema.parse(filtersNormalizados);
    const profissionais = await this.repository.listar(filters);
    return profissionais.map(mapProfissionalToResponse);
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const profissional = await this.repository.buscarPorIdOuFalhar(id);
    return mapProfissionalToResponse(profissional);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId);

    try {
      const profissional = await this.repository.criar({ ...input, foto_3x4: foto.caminhoArquivo });
      if (foto.novoCaminho) {
        await storageService.vincularEntidade(foto.novoCaminho, profissional.id);
      }
      return mapProfissionalToResponse(profissional);
    } catch (error) {
      await storageService.rollbackArquivos([foto.novoCaminho]);
      throw error;
    }
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId, id);

    try {
      const profissional = await this.repository.atualizar(id, { ...input, foto_3x4: foto.caminhoArquivo });
      if (foto.novoCaminho) {
        await storageService.vincularEntidade(foto.novoCaminho, id);
      }
      if (
        this.isManagedStoragePath(existente.foto3x4) &&
        existente.foto3x4 !== profissional.foto3x4
      ) {
        await storageService.desativarPorCaminho(existente.foto3x4, usuarioId);
      }
      return mapProfissionalToResponse(profissional);
    } catch (error) {
      await storageService.rollbackArquivos([foto.novoCaminho]);
      throw error;
    }
  }

  async remover(rawId: string, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    await this.repository.remover(id);
    if (this.isManagedStoragePath(existente.foto3x4)) {
      await storageService.desativarPorCaminho(existente.foto3x4, usuarioId);
    }
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de profissional invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoProfissional
    );
  }

  private async prepararFoto(
    valor?: string,
    nomeCompleto?: string,
    usuarioId?: bigint,
    entidadeId?: bigint
  ) {
    const arquivo = await storageService.persistirCampo({
      scope: "colaborador_foto",
      valor,
      nomeOriginal: `${nomeCompleto?.replace(/\s+/g, "-").toLowerCase() || "colaborador"}-foto.jpg`,
      mimeType: "image/jpeg",
      entidadeId,
      usuarioUploadId: usuarioId,
      observacao: "Foto de colaborador"
    });

    return {
      caminhoArquivo: arquivo.caminhoArquivo,
      novoCaminho: arquivo.registro ? arquivo.caminhoArquivo : undefined
    };
  }

  private isManagedStoragePath(valor?: string | null) {
    if (!valor?.trim()) return false;
    const normalized = valor.trim();
    return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
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
