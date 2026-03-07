import { AppError } from "../../../shared/errors/app-error.js";
import {
  voluntarioFiltersSchema,
  voluntarioInputSchema
} from "../voluntario.schema.js";
import { mapVoluntarioToResponse } from "../voluntario.mapper.js";
import { VoluntarioRepository } from "../repositories/voluntario.repository.js";
import { mapaCamposTextoVoluntario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";

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

  async criar(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = voluntarioInputSchema.parse(inputNormalizado);
    const voluntario = await this.repository.criar(input);
    return mapVoluntarioToResponse(voluntario);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = voluntarioInputSchema.parse(inputNormalizado);
    const voluntario = await this.repository.atualizar(id, input);
    return mapVoluntarioToResponse(voluntario);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
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
}
