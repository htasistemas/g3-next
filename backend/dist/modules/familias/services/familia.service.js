import { AppError } from "../../../shared/errors/app-error.js";
import { familiaBeneficioValidacaoSchema, familiaDesmembramentoInputSchema, familiaEnderecoInputSchema, familiaFiltersSchema, familiaInputSchema, familiaMembroInputSchema, familiaResponsavelInputSchema, familiaTransferenciaMembroInputSchema } from "../familia.schema.js";
import { mapFamiliaToResponse } from "../familia.mapper.js";
import { FamiliaRepository } from "../repositories/familia.repository.js";
import { mapaCamposTextoFamilia, mapaMembroFamilia } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
export class FamiliaService {
    repository = new FamiliaRepository();
    async listar(rawFilters, atorRaw) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? (() => {
                const normalizados = normalizarObjetoTexto(rawFilters, {
                    nome_familia: "instituicao",
                    municipio: "endereco",
                    referencia: "nomePessoa"
                });
                if (typeof normalizados.status === "string") {
                    normalizados.status = normalizados.status.trim().toUpperCase();
                }
                return normalizados;
            })()
            : rawFilters;
        const filters = familiaFiltersSchema.parse(filtersNormalizados);
        const tenantId = this.parseTenant(atorRaw);
        const familias = await this.repository.listar(filters, tenantId);
        return familias.map(mapFamiliaToResponse);
    }
    async buscarPorId(rawId, atorRaw) {
        const id = this.parseId(rawId, "familia");
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async criar(rawInput, atorRaw) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = familiaInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.criar(input, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async atualizar(rawId, rawInput, atorRaw) {
        const id = this.parseId(rawId, "familia");
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = familiaInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.atualizar(id, input, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async adicionarMembro(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const inputNormalizado = rawInput && typeof rawInput === "object"
            ? normalizarObjetoTexto(rawInput, mapaMembroFamilia)
            : rawInput;
        const input = familiaMembroInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.adicionarMembro(familiaId, input, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async atualizarMembro(rawId, rawMembroId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        const inputNormalizado = rawInput && typeof rawInput === "object"
            ? normalizarObjetoTexto(rawInput, mapaMembroFamilia)
            : rawInput;
        const input = familiaMembroInputSchema.parse(inputNormalizado);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.atualizarMembro(familiaId, membroId, input, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async removerMembro(rawId, rawMembroId, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        const tenantId = this.parseTenant(atorRaw);
        await this.repository.removerMembro(familiaId, membroId, tenantId);
    }
    async remover(rawId, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const tenantId = this.parseTenant(atorRaw);
        await this.repository.buscarPorIdOuFalhar(familiaId, tenantId);
        await this.repository.remover(familiaId, tenantId);
    }
    async listarHistorico(rawId, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const tenantId = this.parseTenant(atorRaw);
        return this.repository.listarHistorico(familiaId, tenantId);
    }
    async listarAlertas(rawId, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const tenantId = this.parseTenant(atorRaw);
        return this.repository.listarAlertas(familiaId, tenantId);
    }
    async definirResponsavel(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaResponsavelInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.definirResponsavel(familiaId, BigInt(input.id_beneficiario), tenantId);
        return mapFamiliaToResponse(familia);
    }
    async atualizarEndereco(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaEnderecoInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(atorRaw);
        const familia = await this.repository.atualizarEndereco(familiaId, input, tenantId);
        return mapFamiliaToResponse(familia);
    }
    async validarBeneficioFamiliar(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaBeneficioValidacaoSchema.parse(rawInput);
        const tenantId = this.parseTenant(atorRaw);
        return this.repository.validarBeneficioFamiliar(familiaId, input.beneficio_nome, input.quantidade_dias_carencia, tenantId);
    }
    async transferirMembro(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaTransferenciaMembroInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(atorRaw);
        const resultado = await this.repository.transferirMembro(familiaId, input, tenantId);
        return {
            familia_origem: mapFamiliaToResponse(resultado.familia_origem),
            familia_destino: mapFamiliaToResponse(resultado.familia_destino)
        };
    }
    async desmembrarFamilia(rawId, rawInput, atorRaw) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaDesmembramentoInputSchema.parse(rawInput);
        const tenantId = this.parseTenant(atorRaw);
        const resultado = await this.repository.desmembrarFamilia(familiaId, input, tenantId);
        return {
            familia_origem: mapFamiliaToResponse(resultado.familia_origem),
            familia_nova: mapFamiliaToResponse(resultado.familia_nova)
        };
    }
    parseId(rawId, context) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError(`Identificador de ${context} invalido.`, 400);
        }
        return BigInt(id);
    }
    parseTenant(atorRaw) {
        const tenantId = atorRaw.tenant_id?.trim();
        const instituicaoId = atorRaw.instituicao_id?.trim();
        if (!tenantId || !instituicaoId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        const inputBase = normalizarObjetoTexto(rawInput, mapaCamposTextoFamilia);
        if (Array.isArray(inputBase.membros)) {
            inputBase.membros = inputBase.membros.map((membro) => {
                if (!membro || typeof membro !== "object")
                    return membro;
                return normalizarObjetoTexto(membro, mapaMembroFamilia);
            });
        }
        return inputBase;
    }
}
