import { AppError } from "../../../shared/errors/app-error.js";
import {
  profissionalFiltersSchema,
  profissionalInputSchema
} from "../profissional.schema.js";
import { mapProfissionalToResponse } from "../profissional.mapper.js";
import { ProfissionalRepository } from "../repositories/profissional.repository.js";
import { mapaCamposTextoProfissional } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";

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

  async criar(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const profissional = await this.repository.criar(input);
    return mapProfissionalToResponse(profissional);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = profissionalInputSchema.parse(inputNormalizado);
    const profissional = await this.repository.atualizar(id, input);
    return mapProfissionalToResponse(profissional);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
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
}
