import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoTermoFomento } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTermoFomentoToResponse } from "../termos-fomento.mapper.js";
import { termoAditivoInputSchema, termoFomentoInputSchema } from "../termos-fomento.schema.js";
import { TermosFomentoRepository } from "../repositories/termos-fomento.repository.js";
export class TermosFomentoService {
    repository = new TermosFomentoRepository();
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapTermoFomentoToResponse(item.termo, item.aditivos, item.documentos));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
    }
    async criar(rawInput) {
        const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criar(input);
        return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizar(id, input);
        return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
    }
    async remover(rawId) {
        const id = this.parseId(rawId);
        await this.repository.remover(id);
    }
    async adicionarAditivo(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = termoAditivoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.adicionarAditivo(id, input);
        return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
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
        return normalizarObjetoTexto(rawInput, mapaCamposTextoTermoFomento);
    }
}
