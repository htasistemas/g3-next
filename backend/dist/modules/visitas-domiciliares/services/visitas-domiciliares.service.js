import { AppError } from "../../../shared/errors/app-error.js";
import { mapVisitaRowToResponse } from "../visitas-domiciliares.mapper.js";
import { visitaDomiciliarInputSchema } from "../visitas-domiciliares.schema.js";
import { VisitasDomiciliaresRepository } from "../repositories/visitas-domiciliares.repository.js";
export class VisitasDomiciliaresService {
    repository = new VisitasDomiciliaresRepository();
    async listar(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const rows = await this.repository.listar(tenantId);
        return rows.map(mapVisitaRowToResponse);
    }
    async criar(rawInput, rawTenantId) {
        const input = visitaDomiciliarInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.criar(input, tenantId);
        return mapVisitaRowToResponse(row);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = visitaDomiciliarInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.atualizar(id, input, tenantId);
        return mapVisitaRowToResponse(row);
    }
    async remover(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.remover(id, tenantId);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
