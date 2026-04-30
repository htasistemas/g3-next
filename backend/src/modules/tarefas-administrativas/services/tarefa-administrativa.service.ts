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

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) =>
      mapTarefaAdministrativaToResponse(item.tarefa, item.checklist, item.historico)
    );
  }

  async obterResumo(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    return this.repository.obterResumo(tenantId);
  }

  async buscarPorId(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = tarefaAdministrativaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = tarefaAdministrativaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async adicionarHistorico(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = tarefaAdministrativaHistoricoInputSchema.parse(rawInput);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.adicionarHistorico(id, input.mensagem, tenantId);
    return mapTarefaAdministrativaToResponse(
      registro.tarefa,
      registro.checklist,
      registro.historico
    );
  }

  async remover(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.remover(id, tenantId);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(parsed);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoTarefaAdministrativa
    );
  }
}
