import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPlanoTrabalho } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapPlanoTrabalhoToResponse } from "../planos-trabalho.mapper.js";
import { planoTrabalhoInputSchema } from "../planos-trabalho.schema.js";
import { PlanosTrabalhoRepository } from "../repositories/planos-trabalho.repository.js";
export class PlanosTrabalhoService {
    repository = new PlanosTrabalhoRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapPlanoTrabalhoToResponse(item.plano, item.metas, item.atividades, item.etapas, item.cronograma, item.equipe));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.metas, registro.atividades, registro.etapas, registro.cronograma, registro.equipe);
    }
    async criar(rawInput) {
        const input = planoTrabalhoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.metas, registro.atividades, registro.etapas, registro.cronograma, registro.equipe);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = planoTrabalhoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapPlanoTrabalhoToResponse(registro.plano, registro.metas, registro.atividades, registro.etapas, registro.cronograma, registro.equipe);
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
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoPlanoTrabalho);
    }
}
