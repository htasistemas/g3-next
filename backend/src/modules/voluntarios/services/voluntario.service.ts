import { AppError } from "../../../shared/errors/app-error.js";
import {
  voluntarioFiltersSchema,
  voluntarioInputSchema
} from "../voluntario.schema.js";
import { mapVoluntarioToResponse } from "../voluntario.mapper.js";
import { VoluntarioRepository } from "../repositories/voluntario.repository.js";
import { mapaCamposTextoVoluntario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

export class VoluntarioService {
  private readonly repository = new VoluntarioRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "nomePessoa",
              status: "textoCurto"
            }
          )
        : rawFilters;

    const filters = voluntarioFiltersSchema.parse(filtersNormalizados);
    const voluntarios = await this.repository.listar(filters);
    return voluntarios.map(mapVoluntarioToResponse);
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const voluntario = await this.repository.buscarPorIdOuFalhar(id);
    return mapVoluntarioToResponse(voluntario);
  }

  async criar(rawInput: unknown, rawUsuarioId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = voluntarioInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId);

    try {
      let voluntario;
      try {
        voluntario = await this.repository.criar({ ...input, foto_3x4: foto.caminhoArquivo });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao criar o cadastro do voluntário";

        throw new AppError(`Nao foi possivel salvar o voluntario. ${motivo}.`, 500);
      }

      if (foto.novoCaminho) {
        try {
          await storageService.vincularEntidade(foto.novoCaminho, voluntario.id);
        } catch (error) {
          if (error instanceof AppError) {
            throw error;
          }

          const motivo =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "falha inesperada ao vincular a foto do voluntário";

          throw new AppError(`Nao foi possivel vincular a foto do voluntario. ${motivo}.`, 500);
        }
      }
      return mapVoluntarioToResponse(voluntario);
    } catch (error) {
      await storageService.rollbackArquivos([foto.novoCaminho]);
      throw error;
    }
  }

  async atualizar(rawId: string, rawInput: unknown, rawUsuarioId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = voluntarioInputSchema.parse(inputNormalizado);
    const usuarioId = this.parseUsuarioId(rawUsuarioId);
    const existente = await this.repository.buscarPorIdOuFalhar(id);
    const foto = await this.prepararFoto(input.foto_3x4, input.nome_completo, usuarioId, id);

    try {
      let voluntario;
      try {
        voluntario = await this.repository.atualizar(id, { ...input, foto_3x4: foto.caminhoArquivo });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const motivo =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "falha inesperada ao atualizar o cadastro do voluntário";

        throw new AppError(`Nao foi possivel atualizar o voluntario. ${motivo}.`, 500);
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
              : "falha inesperada ao vincular a foto do voluntário";

          throw new AppError(`Nao foi possivel vincular a foto do voluntario. ${motivo}.`, 500);
        }
      }
      if (
        this.isManagedStoragePath(existente.foto3x4) &&
        existente.foto3x4 !== voluntario.foto3x4
      ) {
        try {
          await storageService.desativarPorCaminho(existente.foto3x4, usuarioId);
        } catch (error) {
          console.warn("[voluntario] falha ao limpar foto antiga apos atualizar cadastro:", error);
        }
      }
      return mapVoluntarioToResponse(voluntario);
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
      throw new AppError("Identificador de voluntario invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoVoluntario
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
        nomeOriginal: `${nomeCompleto?.replace(/\s+/g, "-").toLowerCase() || "voluntario"}-foto.jpg`,
        mimeType: "image/jpeg",
        entidadeId,
        usuarioUploadId: usuarioId,
        observacao: "Foto de colaborador"
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(`Nao foi possivel processar a foto do voluntario: ${error.message}`, error.statusCode);
      }

      const motivo =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "erro desconhecido no processamento da foto";

      throw new AppError(`Nao foi possivel processar a foto do voluntario: ${motivo}.`, 422);
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
}
