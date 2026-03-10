import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoTermoFomento } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTermoFomentoToResponse } from "../termos-fomento.mapper.js";
import { termoAditivoInputSchema, termoFomentoInputSchema } from "../termos-fomento.schema.js";
import { TermosFomentoRepository } from "../repositories/termos-fomento.repository.js";

export class TermosFomentoService {
  private readonly repository = new TermosFomentoRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map((item) =>
      mapTermoFomentoToResponse(item.termo, item.aditivos, item.documentos)
    );
  }

  async obter(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async criar(rawInput: unknown) {
    const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = termoFomentoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  async adicionarAditivo(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = termoAditivoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.adicionarAditivo(id, input);
    return mapTermoFomentoToResponse(registro.termo, registro.aditivos, registro.documentos);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoTermoFomento
    );
  }
}
