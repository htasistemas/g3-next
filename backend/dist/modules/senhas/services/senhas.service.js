import { AppError } from "../../../shared/errors/app-error.js";
import { mapSenhaChamadaRowToResponse, mapSenhaFilaRowToResponse, mapSenhasConfigRowToResponse } from "../senhas.mapper.js";
import { senhaChamarInputSchema, senhaEmitirInputSchema, senhaFinalizarInputSchema, senhasConfigInputSchema } from "../senhas.schema.js";
import { SenhasRepository } from "../repositories/senhas.repository.js";
export class SenhasService {
    repository = new SenhasRepository();
    async listarAguardando(unidadeId, rawTenantId) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const tenantId = this.parseTenant(rawTenantId);
        const rows = await this.repository.listarAguardando(Number.isFinite(unidade) ? unidade : undefined, tenantId);
        return rows.map(mapSenhaFilaRowToResponse);
    }
    async emitir(rawInput, rawTenantId) {
        const input = senhaEmitirInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.emitir(input, tenantId);
        return mapSenhaFilaRowToResponse(row);
    }
    async chamar(rawInput, rawTenantId) {
        const input = senhaChamarInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.chamar(input, tenantId);
        return mapSenhaChamadaRowToResponse(row);
    }
    async finalizar(rawInput, rawTenantId) {
        const input = senhaFinalizarInputSchema.parse(rawInput);
        const chamadaId = Number(input.chamadaId);
        if (!Number.isInteger(chamadaId) || chamadaId <= 0) {
            throw new AppError("Identificador de chamada invalido.", 400);
        }
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.finalizarChamada(BigInt(chamadaId), tenantId);
    }
    async finalizarFila(rawFilaId, rawTenantId) {
        const filaId = Number(rawFilaId);
        if (!Number.isInteger(filaId) || filaId <= 0) {
            throw new AppError("Identificador de fila invalido.", 400);
        }
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.finalizarFila(BigInt(filaId), tenantId);
    }
    async painel(unidadeId, limite, rawTenantId) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const limiteNormalizado = limite ? Number(limite) : 10;
        const tenantId = this.parseTenant(rawTenantId);
        const rows = await this.repository.painel(Number.isFinite(unidade) ? unidade : undefined, Number.isInteger(limiteNormalizado) && limiteNormalizado > 0 ? limiteNormalizado : 10, tenantId);
        return rows.map(mapSenhaChamadaRowToResponse);
    }
    async atual(unidadeId, rawTenantId) {
        const unidade = unidadeId ? Number(unidadeId) : undefined;
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.atual(Number.isFinite(unidade) ? unidade : undefined, tenantId);
        return row ? mapSenhaChamadaRowToResponse(row) : null;
    }
    async obterConfig(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.obterConfig(tenantId);
        return mapSenhasConfigRowToResponse(row);
    }
    async atualizarConfig(rawInput, rawTenantId) {
        const input = senhasConfigInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const row = await this.repository.atualizarConfig(input, tenantId);
        return mapSenhasConfigRowToResponse(row);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
