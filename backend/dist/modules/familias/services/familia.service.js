import { AppError } from "../../../shared/errors/app-error.js";
import { familiaFiltersSchema, familiaInputSchema, familiaMembroInputSchema } from "../familia.schema.js";
import { mapFamiliaToResponse } from "../familia.mapper.js";
import { FamiliaRepository } from "../repositories/familia.repository.js";
export class FamiliaService {
    repository = new FamiliaRepository();
    async listar(rawFilters) {
        const filters = familiaFiltersSchema.parse(rawFilters);
        const familias = await this.repository.listar(filters);
        return familias.map(mapFamiliaToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId, "familia");
        const familia = await this.repository.buscarPorIdOuFalhar(id);
        return mapFamiliaToResponse(familia);
    }
    async criar(rawInput) {
        const input = familiaInputSchema.parse(rawInput);
        const familia = await this.repository.criar(input);
        return mapFamiliaToResponse(familia);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId, "familia");
        const input = familiaInputSchema.parse(rawInput);
        const familia = await this.repository.atualizar(id, input);
        return mapFamiliaToResponse(familia);
    }
    async adicionarMembro(rawId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const input = familiaMembroInputSchema.parse(rawInput);
        const familia = await this.repository.adicionarMembro(familiaId, input);
        return mapFamiliaToResponse(familia);
    }
    async atualizarMembro(rawId, rawMembroId, rawInput) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        const input = familiaMembroInputSchema.parse(rawInput);
        const familia = await this.repository.atualizarMembro(familiaId, membroId, input);
        return mapFamiliaToResponse(familia);
    }
    async removerMembro(rawId, rawMembroId) {
        const familiaId = this.parseId(rawId, "familia");
        const membroId = this.parseId(rawMembroId, "membro");
        await this.repository.removerMembro(familiaId, membroId);
    }
    parseId(rawId, context) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError(`Identificador de ${context} invalido.`, 400);
        }
        return BigInt(id);
    }
}
