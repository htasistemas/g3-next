import { mapProjetoHistoricoToResponse, mapProjetoTarefaToResponse, mapProjetoToResponse } from "../projeto.mapper.js";
import {
  projetoFiltersSchema,
  projetoInputSchema,
  projetoTarefaInputSchema,
  projetoTarefaStatusSchema
} from "../projeto.schema.js";
import { ProjetoRepository } from "../repositories/projeto.repository.js";
import { AppError } from "../../../shared/errors/app-error.js";

type Actor = {
  id?: string;
  nome?: string;
  tenant_id?: string;
  contexto?: { projeto_id?: string; unidade_id?: string };
};

export class ProjetoService {
  private readonly repository = new ProjetoRepository();

  async listar(rawFilters: unknown, rawTenantId?: string, contexto?: Actor["contexto"]) {
    const tenantId = this.parseTenant(rawTenantId);
    const filters = projetoFiltersSchema.parse({ ...(rawFilters as object ?? {}), ...(contexto?.projeto_id ? { id: contexto.projeto_id } : {}) });
    const registros = await this.repository.listar(filters, tenantId);
    return registros.map((item) => mapProjetoToResponse(item.projeto, item.tarefas, item.historico));
  }

  async dashboard(rawFilters: unknown, rawTenantId?: string, contexto?: Actor["contexto"]) {
    const tenantId = this.parseTenant(rawTenantId);
    const filters = projetoFiltersSchema.parse({ ...(rawFilters as object ?? {}), ...(contexto?.projeto_id ? { id: contexto.projeto_id } : {}) });
    return this.repository.dashboard(filters, tenantId);
  }

  async buscarPorId(rawId: string, rawTenantId?: string, contexto?: Actor["contexto"]) {
    const id = this.parseId(rawId, "Projeto");
    const tenantId = this.parseTenant(rawTenantId);
    this.validarProjetoContexto(id, contexto);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapProjetoToResponse(registro.projeto, registro.tarefas, registro.historico);
  }

  async criar(rawInput: unknown, actor: Actor) {
    const tenantId = this.parseTenant(actor.tenant_id);
    const input = projetoInputSchema.parse(rawInput);
    const registro = await this.repository.criar(idActor(actor), actor.nome, input, tenantId);
    return mapProjetoToResponse(registro.projeto, registro.tarefas, registro.historico);
  }

  async atualizar(rawId: string, rawInput: unknown, actor: Actor) {
    const id = this.parseId(rawId, "Projeto");
    const tenantId = this.parseTenant(actor.tenant_id);
    this.validarProjetoContexto(id, actor.contexto);
    const input = projetoInputSchema.parse(rawInput);
    const registro = await this.repository.atualizar(id, idActor(actor), actor.nome, input, tenantId);
    return mapProjetoToResponse(registro.projeto, registro.tarefas, registro.historico);
  }

  async remover(rawId: string, actor: Actor) {
    const id = this.parseId(rawId, "Projeto");
    const tenantId = this.parseTenant(actor.tenant_id);
    this.validarProjetoContexto(id, actor.contexto);
    await this.repository.inativar(id, idActor(actor), actor.nome, tenantId);
  }

  async listarHistorico(rawProjetoId: string, rawTenantId?: string, contexto?: Actor["contexto"]) {
    const projetoId = this.parseId(rawProjetoId, "Projeto");
    const tenantId = this.parseTenant(rawTenantId);
    this.validarProjetoContexto(projetoId, contexto);
    const historico = await this.repository.listarHistorico(projetoId, tenantId);
    return historico.map(mapProjetoHistoricoToResponse);
  }

  async criarTarefa(rawProjetoId: string, rawInput: unknown, actor: Actor) {
    const projetoId = this.parseId(rawProjetoId, "Projeto");
    const tenantId = this.parseTenant(actor.tenant_id);
    this.validarProjetoContexto(projetoId, actor.contexto);
    const input = projetoTarefaInputSchema.parse(rawInput);
    const tarefa = await this.repository.criarTarefa(
      projetoId,
      idActor(actor),
      actor.nome,
      input,
      tenantId
    );
    return mapProjetoTarefaToResponse(tarefa);
  }

  async atualizarTarefa(rawProjetoId: string, rawTarefaId: string, rawInput: unknown, actor: Actor) {
    const projetoId = this.parseId(rawProjetoId, "Projeto");
    const tarefaId = this.parseId(rawTarefaId, "Tarefa");
    const tenantId = this.parseTenant(actor.tenant_id);
    this.validarProjetoContexto(projetoId, actor.contexto);
    const input = projetoTarefaInputSchema.parse(rawInput);
    const tarefa = await this.repository.atualizarTarefa(
      projetoId,
      tarefaId,
      idActor(actor),
      actor.nome,
      input,
      tenantId
    );
    return mapProjetoTarefaToResponse(tarefa);
  }

  async moverTarefa(
    rawProjetoId: string,
    rawTarefaId: string,
    rawInput: unknown,
    actor: Actor
  ) {
    const projetoId = this.parseId(rawProjetoId, "Projeto");
    const tarefaId = this.parseId(rawTarefaId, "Tarefa");
    const tenantId = this.parseTenant(actor.tenant_id);
    this.validarProjetoContexto(projetoId, actor.contexto);
    const parsed = projetoTarefaStatusSchema.safeParse((rawInput as { status?: unknown })?.status);
    if (!parsed.success) {
      throw new AppError("Informe o status de destino da tarefa.", 400);
    }
    const tarefa = await this.repository.moverTarefa(
      projetoId,
      tarefaId,
      idActor(actor),
      actor.nome,
      parsed.data,
      tenantId
    );
    return mapProjetoTarefaToResponse(tarefa);
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private validarProjetoContexto(projetoId: bigint, contexto?: Actor["contexto"]) {
    if (contexto?.projeto_id && contexto.projeto_id !== projetoId.toString()) {
      throw new AppError("Projeto fora do contexto organizacional ativo.", 403);
    }
  }

  private parseId(rawId: string, label: string) {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError(`Identificador de ${label.toLowerCase()} invalido.`, 400);
    }
    return BigInt(parsed);
  }
}

function idActor(actor: Actor) {
  if (!actor.id) return undefined;
  const parsed = Number(actor.id);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return BigInt(parsed);
}
