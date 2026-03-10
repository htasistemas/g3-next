import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoTarefaAdministrativa } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTarefaAdministrativaToResponse } from "../tarefa-administrativa.mapper.js";
import {
  tarefaAdministrativaHistoricoInputSchema,
  tarefaAdministrativaInputSchema
} from "../tarefa-administrativa.schema.js";
import { TarefaAdministrativaRepository } from "../repositories/tarefa-administrativa.repository.js";

export class TarefaAdministrativaService {
  private readonly repository = new TarefaAdministrativaRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map((item) =>
      mapTarefaAdministrativaToResponse(item.tarefa, item.checklist, item.historico)
    );
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async criar(rawInput: unknown) {
    const input = tarefaAdministrativaInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = tarefaAdministrativaInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async adicionarHistorico(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = tarefaAdministrativaHistoricoInputSchema.parse(rawInput);
    const registro = await this.repository.adicionarHistorico(id, input.mensagem);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoTarefaAdministrativa
    );
  }
}
