import { AppError } from "../../../shared/errors/app-error.js";
import { familiaFiltersSchema, familiaInputSchema, familiaMembroInputSchema } from "../familia.schema.js";
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
