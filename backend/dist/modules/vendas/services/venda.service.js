import { AppError } from "../../../shared/errors/app-error.js";
import { vendaFiltersSchema, vendaInputSchema } from "../venda.schema.js";
import { mapVendaToResponse } from "../venda.mapper.js";
import { VendaRepository } from "../repositories/venda.repository.js";
export class VendaService {
    repository = new VendaRepository();
    async listar(rawFilters, rawTenantId) {
        const filters = vendaFiltersSchema.parse(rawFilters ?? {});
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listar(filters, tenantId);
        return Promise.all(registros.map(async (registro) => {
            const itens = await this.repository.listarItensPorVendaId(registro.id, tenantId);
            return mapVendaToResponse(registro, itens);
        }));
    }
    async buscarPorId(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const venda = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const itens = await this.repository.listarItensPorVendaId(id, tenantId);
        return mapVendaToResponse(venda, itens);
    }
    async criar(rawInput, rawTenantId) {
        const input = vendaInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const venda = await this.repository.criar(input, tenantId);
        const itens = await this.repository.listarItensPorVendaId(venda.id, tenantId);
        return mapVendaToResponse(venda, itens);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador da venda invalido.", 400);
        }
        return BigInt(id);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
