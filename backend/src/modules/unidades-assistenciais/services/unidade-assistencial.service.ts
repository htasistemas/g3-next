import { AppError } from "../../../shared/errors/app-error.js";
import {
  unidadeAssistencialFiltersSchema,
  unidadeAssistencialInputSchema
} from "../unidade-assistencial.schema.js";
import { mapUnidadeAssistencialToResponse } from "../unidade-assistencial.mapper.js";
import { UnidadeAssistencialRepository } from "../repositories/unidade-assistencial.repository.js";
import {
  mapaCamposTextoUnidadeAssistencial,
  mapaDiretoriaUnidade
} from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";

export class UnidadeAssistencialService {
  private readonly repository = new UnidadeAssistencialRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome_fantasia: "instituicao",
              cidade: "endereco"
            }
          )
        : rawFilters;

    const filters = unidadeAssistencialFiltersSchema.parse(filtersNormalizados);
    const unidades = await this.repository.listar(filters);
    return unidades.map(mapUnidadeAssistencialToResponse);
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const unidade = await this.repository.buscarPorIdOuFalhar(id);
    return mapUnidadeAssistencialToResponse(unidade);
  }

  async buscarAtual() {
    const unidade = await this.repository.buscarAtual();
    return unidade ? mapUnidadeAssistencialToResponse(unidade) : null;
  }

  async criar(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
    const unidade = await this.repository.criar(input);
    return mapUnidadeAssistencialToResponse(unidade);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = unidadeAssistencialInputSchema.parse(inputNormalizado);
    const unidade = await this.repository.atualizar(id, input);
    return mapUnidadeAssistencialToResponse(unidade);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de unidade assistencial invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    const inputBase = normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoUnidadeAssistencial
    );

    if (Array.isArray(inputBase.diretoria)) {
      inputBase.diretoria = inputBase.diretoria.map((membro) => {
        if (!membro || typeof membro !== "object") return membro;
        return normalizarObjetoTexto(membro as Record<string, unknown>, mapaDiretoriaUnidade);
      });
    }

    return inputBase;
  }
}
