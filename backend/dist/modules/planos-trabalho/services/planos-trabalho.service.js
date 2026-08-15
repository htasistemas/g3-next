import { AppError } from "../../../shared/errors/app-error.js";
import { mapPlanoTrabalhoToResponse } from "../planos-trabalho.mapper.js";
import { planoTrabalhoInputSchema } from "../planos-trabalho.schema.js";
import { PlanosTrabalhoRepository } from "../repositories/planos-trabalho.repository.js";
import { garantirConformidadeParaEnvio, normalizarPlanoTrabalhoInput } from "../planos-trabalho.utils.js";
export class PlanosTrabalhoService {
    repository = new PlanosTrabalhoRepository();
    async listar(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listar(tenantId);
        return registros.map((item) => mapPlanoTrabalhoToResponse(item.plano, item.objetivosEspecificos, item.metas, item.etapas, item.aplicacaoRecursos, item.desembolso, item.checklistPrestacao));
    }
    async obter(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
    }
    async criar(rawInput, rawTenantId) {
        const input = this.parseInput(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criar(input, tenantId);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = this.parseInput(rawInput);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizar(id, input, tenantId);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
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
    parseInput(rawInput) {
        const input = planoTrabalhoInputSchema.parse(rawInput);
        const normalizado = normalizarPlanoTrabalhoInput(input);
        garantirConformidadeParaEnvio(normalizado);
        return normalizado;
    }
}
