import { AppError } from "../../../shared/errors/app-error.js";
import { mapLembreteDiarioToResponse } from "../lembrete-diario.mapper.js";
import { lembreteDiarioAdiarSchema, lembreteDiarioInputSchema } from "../lembrete-diario.schema.js";
import { LembreteDiarioRepository } from "../repositories/lembrete-diario.repository.js";
export class LembreteDiarioService {
    repository = new LembreteDiarioRepository();
    async listar(rawUsuarioId, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const usuarioId = typeof rawUsuarioId === "string" && rawUsuarioId.trim()
            ? Number(rawUsuarioId)
            : typeof rawUsuarioId === "number"
                ? rawUsuarioId
                : undefined;
        const registros = await this.repository.listar(Number.isInteger(usuarioId) && usuarioId > 0 ? usuarioId : undefined, tenantId);
        return registros.map(mapLembreteDiarioToResponse);
    }
    async obterResumo(rawUsuarioId, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const usuarioId = typeof rawUsuarioId === "string" && rawUsuarioId.trim()
            ? Number(rawUsuarioId)
            : typeof rawUsuarioId === "number"
                ? rawUsuarioId
                : undefined;
        return this.repository.obterResumo(Number.isInteger(usuarioId) && usuarioId > 0 ? usuarioId : undefined, tenantId);
    }
    async criar(rawInput, rawTenantId) {
        const input = lembreteDiarioInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criar(input, tenantId);
        return mapLembreteDiarioToResponse(registro);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = lembreteDiarioInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizar(id, input, tenantId);
        return mapLembreteDiarioToResponse(registro);
    }
    async concluir(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.concluir(id, tenantId);
        return mapLembreteDiarioToResponse(registro);
    }
    async adiar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = lembreteDiarioAdiarSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.adiar(id, input, tenantId);
        return mapLembreteDiarioToResponse(registro);
    }
    async excluir(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.excluir(id, tenantId);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador inválido.", 400);
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
