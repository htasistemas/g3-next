import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPatrimonio } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapPatrimonioToResponse } from "../patrimonio.mapper.js";
import { patrimonioInputSchema, patrimonioMovimentoInputSchema } from "../patrimonio.schema.js";
import { PatrimonioRepository } from "../repositories/patrimonio.repository.js";
export class PatrimonioService {
    repository = new PatrimonioRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapPatrimonioToResponse(item.patrimonio, item.movimentos));
    }
    async criar(rawInput) {
        const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = patrimonioInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
    }
    async registrarMovimento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = patrimonioMovimentoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.registrarMovimento(id, input);
        return mapPatrimonioToResponse(registro.patrimonio, registro.movimentos);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador inválido.", 400);
        }
        return BigInt(id);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoPatrimonio);
    }
}
