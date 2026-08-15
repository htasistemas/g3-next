import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoador, mapaCamposTextoRegistroDoacao } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { doadorInputSchema, registroDoacaoFiltersSchema, registroDoacaoInputSchema } from "../registro-doacao.schema.js";
import { mapDoadorToResponse, mapRegistroDoacaoToResponse } from "../registro-doacao.mapper.js";
import { RegistroDoacaoRepository } from "../repositories/registro-doacao.repository.js";
export class RegistroDoacaoService {
    repository = new RegistroDoacaoRepository();
    async listar(rawFilters, rawTenantId) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                doador_nome: "nomePessoa",
                tipo_doacao: "textoCurto",
                status: "textoCurto"
            })
            : rawFilters;
        const filters = registroDoacaoFiltersSchema.parse(filtersNormalizados);
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listar(filters, tenantId);
        return registros.map((registro) => mapRegistroDoacaoToResponse(registro, []));
    }
    async buscarPorId(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
    }
    async criar(rawInput, rawTenantId) {
        const inputNormalizado = this.normalizarPayloadRegistro(rawInput);
        const input = registroDoacaoInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criar(input, tenantId);
        return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayloadRegistro(rawInput);
        const input = registroDoacaoInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizar(id, input, tenantId);
        return mapRegistroDoacaoToResponse(registro.registro, registro.itens);
    }
    async remover(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.remover(id, tenantId);
    }
    async listarDoadores(rawTermo, rawTenantId) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        const tenantId = this.parseTenant(rawTenantId);
        const doadores = await this.repository.listarDoadores(termo, tenantId);
        return doadores.map(mapDoadorToResponse);
    }
    async criarDoador(rawInput, rawTenantId) {
        const inputNormalizado = this.normalizarPayloadDoador(rawInput);
        const input = doadorInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(rawTenantId);
        const doador = await this.repository.criarDoador(input, tenantId);
        return mapDoadorToResponse(doador);
    }
    async removerDoador(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerDoador(id, tenantId);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador invalido.", 400);
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
    normalizarPayloadRegistro(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoRegistroDoacao);
    }
    normalizarPayloadDoador(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        return normalizarObjetoTexto(rawInput, mapaCamposTextoDoador);
    }
}
