import { AppError } from "../../../shared/errors/app-error.js";
import { vendaFiltersSchema, vendaInputSchema } from "../venda.schema.js";
import { mapVendaToResponse } from "../venda.mapper.js";
import { VendaRepository } from "../repositories/venda.repository.js";

export class VendaService {
  private readonly repository = new VendaRepository();

  async listar(rawFilters: unknown, rawTenantId?: string) {
    const filters = vendaFiltersSchema.parse(rawFilters ?? {});
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(filters, tenantId);
    return Promise.all(
      registros.map(async (registro) => {
        const itens = await this.repository.listarItensPorVendaId(registro.id, tenantId);
        return mapVendaToResponse(registro, itens);
      })
    );
  }

  async buscarPorId(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const venda = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const itens = await this.repository.listarItensPorVendaId(id, tenantId);
    return mapVendaToResponse(venda, itens);
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = vendaInputSchema.parse(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const venda = await this.repository.criar(input, tenantId);
    const itens = await this.repository.listarItensPorVendaId(venda.id, tenantId);
    return mapVendaToResponse(venda, itens);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador da venda invalido.", 400);
    }
    return BigInt(id);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
