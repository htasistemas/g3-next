import { AppError } from "../../../shared/errors/app-error.js";
import {
  agendamentoCheckInInputSchema,
  agendamentoConclusaoInputSchema,
  agendamentoFiltrosSchema,
  agendamentoInputSchema,
  agendamentoListaEsperaInputSchema,
  agendamentoOperacionalInputSchema,
  agendamentoRemarcacaoInputSchema
} from "../agendamentos.schema.js";
import { AgendamentosRepository } from "../repositories/agendamentos.repository.js";

type UsuarioActor = { id?: string; nome?: string; nomeUsuario?: string };

export class AgendamentosService {
  private readonly repository = new AgendamentosRepository();

  async listar(rawFilters: unknown, tenantId?: string) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.listar(filtros, this.parseTenantId(tenantId));
  }

  async obter(rawId: string, tenantId?: string) {
    return this.repository.obter(this.parseId(rawId), this.parseTenantId(tenantId));
  }

  async criar(rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const tenantObrigatorio = this.parseTenantId(tenantId);
    const body = rawInput as Record<string, unknown>;
    if (body && "itemId" in body && "tipo" in body && ("beneficiariosIds" in body || "matriculasIds" in body)) {
      const input = agendamentoOperacionalInputSchema.parse(rawInput);
      if (input.id) {
        return this.repository.atualizarOperacional(this.parseId(input.id), input, usuario, tenantObrigatorio);
      }
      return this.repository.criarOperacional(input, usuario, tenantObrigatorio);
    }
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.criar(input, usuario, tenantObrigatorio);
  }

  async atualizar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.atualizar(this.parseId(rawId), input, usuario, this.parseTenantId(tenantId));
  }

  async cancelar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const body = (rawInput ?? {}) as { motivo?: string };
    return this.repository.cancelar(this.parseId(rawId), body.motivo, usuario, this.parseTenantId(tenantId));
  }

  async remarcar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const input = agendamentoRemarcacaoInputSchema.parse(rawInput);
    return this.repository.remarcar(this.parseId(rawId), input, usuario, this.parseTenantId(tenantId));
  }

  async confirmar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const body = (rawInput ?? {}) as { canal?: string; observacao?: string };
    return this.repository.confirmar(
      this.parseId(rawId),
      body.canal,
      body.observacao,
      usuario,
      this.parseTenantId(tenantId)
    );
  }

  async checkIn(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const input = agendamentoCheckInInputSchema.parse(rawInput);
    return this.repository.checkIn(this.parseId(rawId), input, usuario, this.parseTenantId(tenantId));
  }

  async concluir(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const input = agendamentoConclusaoInputSchema.parse(rawInput);
    return this.repository.concluir(this.parseId(rawId), input, usuario, this.parseTenantId(tenantId));
  }

  async listarListaEspera(tenantId?: string) {
    return this.repository.listarListaEspera(this.parseTenantId(tenantId));
  }

  async criarListaEspera(rawInput: unknown, tenantId?: string) {
    const input = agendamentoListaEsperaInputSchema.parse(rawInput);
    return this.repository.criarListaEspera(input, this.parseTenantId(tenantId));
  }

  async converterListaEspera(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.converterListaEspera(this.parseId(rawId), input, usuario, this.parseTenantId(tenantId));
  }

  async indicadores(rawFilters: unknown, tenantId?: string) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.indicadores(filtros, this.parseTenantId(tenantId));
  }

  async catalogos(tenantId?: string) {
    return this.repository.catalogos(this.parseTenantId(tenantId));
  }

  async listarItens(rawTipo: unknown, rawBusca: unknown, tenantId?: string) {
    const tipo = String(rawTipo ?? "").trim().toLowerCase();
    if (!["curso", "atendimento", "oficina"].includes(tipo)) {
      throw new AppError("Tipo operacional invalido.", 400);
    }
    return this.repository.listarItensOperacionais(
      tipo as "curso" | "atendimento" | "oficina",
      typeof rawBusca === "string" ? rawBusca : undefined,
      this.parseTenantId(tenantId)
    );
  }

  async listarBeneficiarios(rawItemId: unknown, tenantId?: string) {
    const itemId = Number(rawItemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError("Item operacional invalido.", 400);
    }
    return this.repository.listarBeneficiariosOperacionais(BigInt(itemId), this.parseTenantId(tenantId));
  }

  async notificar(rawId: string, rawBody: unknown, usuario?: UsuarioActor, tenantId?: string) {
    const body = (rawBody ?? {}) as { canal?: string };
    const canal = String(body.canal ?? "").trim().toUpperCase();
    if (canal !== "WHATSAPP" && canal !== "EMAIL") {
      throw new AppError("Canal de notificacao invalido.", 400);
    }
    return this.repository.notificar(this.parseId(rawId), canal, usuario, this.parseTenantId(tenantId));
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private parseTenantId(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }
}
