import { AppError } from "../../../shared/errors/app-error.js";
import { beneficiarioFiltersSchema, beneficiarioInputSchema } from "../beneficiario.schema.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
import { BeneficiarioRepository } from "../repositories/beneficiario.repository.js";
export class BeneficiarioService {
    repository = new BeneficiarioRepository();
    async listar(rawFilters) {
        const filters = beneficiarioFiltersSchema.parse(rawFilters);
        const beneficiarios = await this.repository.listar(filters);
        return beneficiarios.map(mapBeneficiarioToResponse);
    }
    async buscarPorId(rawId) {
        const id = this.parseId(rawId);
        const beneficiario = await this.repository.buscarPorIdOuFalhar(id);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async criar(rawInput) {
        const input = beneficiarioInputSchema.parse(rawInput);
        const beneficiario = await this.repository.criar(input);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = beneficiarioInputSchema.parse(rawInput);
        const beneficiario = await this.repository.atualizar(id, input);
        return mapBeneficiarioToResponse(beneficiario);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async obterProximoCodigo() {
        const codigo = await this.repository.obterProximoCodigo();
        return { codigo };
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador de beneficiario invalido.", 400);
        }
        return BigInt(id);
    }
}
