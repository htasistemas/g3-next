import { AppError } from "../../../shared/errors/app-error.js";
import { mapPlanoTrabalhoToResponse } from "../planos-trabalho.mapper.js";
import { planoTrabalhoInputSchema } from "../planos-trabalho.schema.js";
import { PlanosTrabalhoRepository } from "../repositories/planos-trabalho.repository.js";
import { garantirConformidadeParaEnvio, normalizarPlanoTrabalhoInput } from "../planos-trabalho.utils.js";
export class PlanosTrabalhoService {
    repository = new PlanosTrabalhoRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapPlanoTrabalhoToResponse(item.plano, item.objetivosEspecificos, item.metas, item.etapas, item.aplicacaoRecursos, item.desembolso, item.checklistPrestacao));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
    }
    async criar(rawInput) {
        const input = this.parseInput(rawInput);
        const registro = await this.repository.criar(input);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = this.parseInput(rawInput);
        const registro = await this.repository.atualizar(id, input);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.objetivosEspecificos, registro.metas, registro.etapas, registro.aplicacaoRecursos, registro.desembolso, registro.checklistPrestacao);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseInput(rawInput) {
        const input = planoTrabalhoInputSchema.parse(rawInput);
        const normalizado = normalizarPlanoTrabalhoInput(input);
        garantirConformidadeParaEnvio(normalizado);
        return normalizado;
    }
}
