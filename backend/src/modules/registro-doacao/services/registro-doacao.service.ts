import { AppError } from "../../../shared/errors/app-error.js";
import {
  mapaCamposTextoDoador,
  mapaCamposTextoRegistroDoacao
} from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  doadorInputSchema,
  registroDoacaoFiltersSchema,
  registroDoacaoInputSchema
} from "../registro-doacao.schema.js";
import { mapDoadorToResponse, mapRegistroDoacaoToResponse } from "../registro-doacao.mapper.js";
import { RegistroDoacaoRepository } from "../repositories/registro-doacao.repository.js";

export class RegistroDoacaoService {
  private readonly repository = new RegistroDoacaoRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(rawFilters as Record<string, unknown>, {
            doador_nome: "nomePessoa",
            tipo_doacao: "textoCurto",
            status: "textoCurto"
          })
        : rawFilters;

    const filters = registroDoacaoFiltersSchema.parse(filtersNormalizados);
    const registros = await this.repository.listar(filters);
    return registros.map((registro) => mapRegistroDoacaoToResponse(registro, []));
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
  }

  async criar(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayloadRegistro(rawInput);
    const input = registroDoacaoInputSchema.parse(inputNormalizado);
    const registro = await this.repository.criar(input);
    return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayloadRegistro(rawInput);
    const input = registroDoacaoInputSchema.parse(inputNormalizado);
    const registro = await this.repository.atualizar(id, input);
    return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  async listarDoadores(rawTermo?: unknown) {
    const termo = typeof rawTermo === "string" ? rawTermo : undefined;
    const doadores = await this.repository.listarDoadores(termo);
    return doadores.map(mapDoadorToResponse);
  }

  async criarDoador(rawInput: unknown) {
    const inputNormalizado = this.normalizarPayloadDoador(rawInput);
    const input = doadorInputSchema.parse(inputNormalizado);
    const doador = await this.repository.criarDoador(input);
    return mapDoadorToResponse(doador);
  }

  async removerDoador(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerDoador(id);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayloadRegistro(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoRegistroDoacao
    );
  }

  private normalizarPayloadDoador(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoDoador
    );
  }
}
