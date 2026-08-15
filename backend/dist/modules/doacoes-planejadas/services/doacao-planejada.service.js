import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoacaoPlanejada } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { doacaoPlanejadaFiltersSchema, doacaoPlanejadaInputSchema } from "../doacao-planejada.schema.js";
import { mapDoacaoPlanejadaToResponse } from "../doacao-planejada.mapper.js";
import { DoacaoPlanejadaRepository } from "../repositories/doacao-planejada.repository.js";
export class DoacaoPlanejadaService {
    repository = new DoacaoPlanejadaRepository();
    async listar(rawFilters, rawTenantId) {
        const tenantId = this.parseTenantId(rawTenantId);
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                status: "textoCurto"
            })
            : rawFilters;
        const filters = doacaoPlanejadaFiltersSchema.parse(filtersNormalizados);
        const registros = await this.repository.listar(filters, tenantId);
        return registros.map((registro) => mapDoacaoPlanejadaToResponse(registro));
    }
    async buscarPorId(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(rawTenantId);
        const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async criar(rawInput, rawTenantId) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenantId(rawTenantId);
        const registro = await this.repository.criar(input, tenantId);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenantId(rawTenantId);
        const registro = await this.repository.atualizar(id, input, tenantId);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async remover(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id, this.parseTenantId(rawTenantId));
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoDoacaoPlanejada);
    }
    parseTenantId(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant nao identificado.", 401);
        }
        return tenantId;
    }
}
