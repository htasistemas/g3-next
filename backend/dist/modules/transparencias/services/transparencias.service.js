import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPrestacaoContas } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTransparenciaToResponse } from "../transparencias.mapper.js";
import { transparenciaInputSchema } from "../transparencias.schema.js";
import { TransparenciasRepository } from "../repositories/transparencias.repository.js";
export class TransparenciasService {
    repository = new TransparenciasRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapTransparenciaToResponse(item.transparencia, item.recebimentos, item.destinacoes, item.comprovantes, item.timelines, item.checklist));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapTransparenciaToResponse(registro.transparencia, registro.recebimentos, registro.destinacoes, registro.comprovantes, registro.timelines, registro.checklist);
    }
    async criar(rawInput) {
        const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapTransparenciaToResponse(registro.transparencia, registro.recebimentos, registro.destinacoes, registro.comprovantes, registro.timelines, registro.checklist);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapTransparenciaToResponse(registro.transparencia, registro.recebimentos, registro.destinacoes, registro.comprovantes, registro.timelines, registro.checklist);
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoPrestacaoContas);
    }
}
