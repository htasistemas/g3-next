import { AppError } from "../../../shared/errors/app-error.js";
import { familiaBeneficioValidacaoSchema, familiaDesmembramentoInputSchema, familiaEnderecoInputSchema, familiaFiltersSchema, familiaInputSchema, familiaMembroInputSchema, familiaResponsavelInputSchema, familiaTransferenciaMembroInputSchema } from "../familia.schema.js";
import { mapFamiliaToResponse } from "../familia.mapper.js";
import { FamiliaRepository } from "../repositories/familia.repository.js";
import { mapaCamposTextoFamilia, mapaMembroFamilia } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
export class FamiliaService {
    repository = new FamiliaRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                nome_familia: "instituicao",
                municipio: "endereco",
                referencia: "nomePessoa",
                status: "textoCurto"
            })
            : rawFilters;
        const filters = familiaFiltersSchema.parse(filtersNormalizados);
        const familias = await this.repository.listar(filters);
        return familias.map(mapFamiliaToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId, "familia");
        const familia = await this.repository.buscarPorIdOuFalhar(id);
        return mapFamiliaToResponse(familia);
    }
    async criar(rawInput) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = familiaInputSchema.parse(inputNormalizado);
        const familia = await this.repository.criar(input);
        return mapFamiliaToResponse(familia);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId, "familia");
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = familiaInputSchema.parse(inputNormalizado);
        const familia = await this.repository.atualizar(id, input);
        return mapFamiliaToResponse(familia);
    }
    async adicionarMembro(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const inputNormalizado = rawInput && typeof rawInput === "object"
            ? normalizarObjetoTexto(rawInput, mapaMembroFamilia)
            : rawInput;
        const input = familiaMembroInputSchema.parse(inputNormalizado);
        const familia = await this.repository.adicionarMembro(familiaId, input);
        return mapFamiliaToResponse(familia);
    }
    async atualizarMembro(rawId, rawMembroId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        const inputNormalizado = rawInput && typeof rawInput === "object"
            ? normalizarObjetoTexto(rawInput, mapaMembroFamilia)
            : rawInput;
        const input = familiaMembroInputSchema.parse(inputNormalizado);
        const familia = await this.repository.atualizarMembro(familiaId, membroId, input);
        return mapFamiliaToResponse(familia);
    }
    async removerMembro(rawId, rawMembroId) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        await this.repository.removerMembro(familiaId, membroId);
    }
    async remover(rawId) {
        const familiaId = this.parseId(rawId, "familia");
        await this.repository.buscarPorIdOuFalhar(familiaId);
        await this.repository.remover(familiaId);
    }
    async listarHistorico(rawId) {
        const familiaId = this.parseId(rawId, "familia");
        return this.repository.listarHistorico(familiaId);
    }
    async listarAlertas(rawId) {
        const familiaId = this.parseId(rawId, "familia");
        return this.repository.listarAlertas(familiaId);
    }
    async definirResponsavel(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaResponsavelInputSchema.parse(rawInput);
        const familia = await this.repository.definirResponsavel(familiaId, BigInt(input.id_beneficiario));
        return mapFamiliaToResponse(familia);
    }
    async atualizarEndereco(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaEnderecoInputSchema.parse(rawInput);
        const familia = await this.repository.atualizarEndereco(familiaId, input);
        return mapFamiliaToResponse(familia);
    }
    async validarBeneficioFamiliar(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaBeneficioValidacaoSchema.parse(rawInput);
        return this.repository.validarBeneficioFamiliar(familiaId, input.beneficio_nome, input.quantidade_dias_carencia);
    }
    async transferirMembro(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaTransferenciaMembroInputSchema.parse(rawInput);
        const resultado = await this.repository.transferirMembro(familiaId, input);
        return {
            familia_origem: mapFamiliaToResponse(resultado.familia_origem),
            familia_destino: mapFamiliaToResponse(resultado.familia_destino)
        };
    }
    async desmembrarFamilia(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaDesmembramentoInputSchema.parse(rawInput);
        const resultado = await this.repository.desmembrarFamilia(familiaId, input);
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
