import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoDoacaoPlanejada } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { doacaoPlanejadaFiltersSchema, doacaoPlanejadaInputSchema } from "../doacao-planejada.schema.js";
import { mapDoacaoPlanejadaToResponse } from "../doacao-planejada.mapper.js";
import { DoacaoPlanejadaRepository } from "../repositories/doacao-planejada.repository.js";
export class DoacaoPlanejadaService {
    repository = new DoacaoPlanejadaRepository();
    async listar(rawFilters) {
        const filtersNormalizados = rawFilters && typeof rawFilters === "object"
            ? normalizarObjetoTexto(rawFilters, {
                status: "textoCurto"
            })
            : rawFilters;
        const filters = doacaoPlanejadaFiltersSchema.parse(filtersNormalizados);
        const registros = await this.repository.listar(filters);
        return registros.map((registro) => mapDoacaoPlanejadaToResponse(registro));
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async criar(rawInput) {
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
        const registro = await this.repository.criar(input);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const inputNormalizado = this.normalizarPayload(rawInput);
        const input = doacaoPlanejadaInputSchema.parse(inputNormalizado);
        const registro = await this.repository.atualizar(id, input);
        return mapDoacaoPlanejadaToResponse(registro);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
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
}
