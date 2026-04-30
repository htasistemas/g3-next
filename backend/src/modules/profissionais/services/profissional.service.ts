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

  async listar(rawFilters: unknown, rawTenantId?: string) {
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
    const tenantId = this.parseTenant(rawTenantId);
    const profissionais = await this.repository.listar(filters, tenantId);
    return profissionais.map(mapProfissionalToResponse);
  }

  async buscarPorId(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const profissional = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapProfissionalToResponse(profissional);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId);

    try {
      let profissional;
      try {
        profissional = await this.repository.criar(
          { ...input, foto_3x4: foto.caminhoArquivo },
          tenantId
        );
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao criar o cadastro do profissional";

        throw new AppError(`Nao foi possivel salvar o profissional. ${motivo}.`, 500);
      }

      if (foto.novoCaminho) {
        try {
          await storageService.vincularEntidade(foto.novoCaminho, profissional.id);
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          const motivo =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "falha inesperada ao vincular a foto do profissional";

          throw new AppError(`Nao foi possivel vincular a foto do profissional. ${motivo}.`, 500);
        }
      }

      return mapProfissionalToResponse(profissional);
    } catch (error) {
      await storageService.rollbackArquivos([foto.novoCaminho]);
      throw error;
    }
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId, id);

    try {
      let profissional;
      try {
        profissional = await this.repository.atualizar(
          id,
          { ...input, foto_3x4: foto.caminhoArquivo },
          tenantId
        );
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao atualizar o cadastro do profissional";

        throw new AppError(`Nao foi possivel atualizar o profissional. ${motivo}.`, 500);
      }

      if (foto.novoCaminho) {
        try {
          await storageService.vincularEntidade(foto.novoCaminho, id);
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          const motivo =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "falha inesperada ao vincular a foto do profissional";

          throw new AppError(`Nao foi possivel vincular a foto do profissional. ${motivo}.`, 500);
        }
      }

      if (
        this.isManagedStoragePath(existente.foto3x4) &&
        existente.foto3x4 !== profissional.foto3x4
      ) {
        try {
          await storageService.desativarPorCaminho(existente.foto3x4, usuarioId);
        } catch (error) {
          console.warn("[profissional] falha ao limpar foto antiga apos atualizar cadastro:", error);
        }
      }
      return mapProfissionalToResponse(profissional);
    } catch (error) {
      await storageService.rollbackArquivos([foto.novoCaminho]);
      throw error;
    }
  }

  async remover(rawId: string, rawUsuarioId?: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const existente = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    await this.repository.remover(id, tenantId);
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
    let arquivo;
    try {
      arquivo = await storageService.persistirCampo({
        scope: "colaborador_foto",
        valor,
        nomeOriginal: `${nomeCompleto?.replace(/\s+/g, "-").toLowerCase() || "colaborador"}-foto.jpg`,
        mimeType: "image/jpeg",
        entidadeId,
        usuarioUploadId: usuarioId,
        observacao: "Foto de colaborador"
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(`Nao foi possivel processar a foto do profissional: ${error.message}`, error.statusCode);
      }

      const motivo =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "erro desconhecido no processamento da foto";

      throw new AppError(`Nao foi possivel processar a foto do profissional: ${motivo}.`, 422);
    }

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

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
