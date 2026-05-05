import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoacaoPlanejada } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  doacaoPlanejadaFiltersSchema,
  doacaoPlanejadaInputSchema
} from "../doacao-planejada.schema.js";
import { mapDoacaoPlanejadaToResponse } from "../doacao-planejada.mapper.js";
import { DoacaoPlanejadaRepository } from "../repositories/doacao-planejada.repository.js";

export class DoacaoPlanejadaService {
  private readonly repository = new DoacaoPlanejadaRepository();

  async listar(rawFilters: unknown, rawTenantId?: string) {
    const tenantId = this.parseTenantId(rawTenantId);
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(rawFilters as Record<string, unknown>, {
            status: "textoCurto"
          })
        : rawFilters;

    const filters = doacaoPlanejadaFiltersSchema.parse(filtersNormalizados);
    const registros = await this.repository.listar(filters, tenantId);
    return registros.map((registro) => mapDoacaoPlanejadaToResponse(registro));
  }

  async buscarPorId(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenantId(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapDoacaoPlanejadaToResponse(registro);
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
    const tenantId = this.parseTenantId(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapDoacaoPlanejadaToResponse(registro);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
    const tenantId = this.parseTenantId(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapDoacaoPlanejadaToResponse(registro);
  }

  async remover(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id, this.parseTenantId(rawTenantId));
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoDoacaoPlanejada
    );
  }

  private parseTenantId(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant nao identificado.", 401);
    }
    return tenantId;
  }
}

