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
  private readonly presentationTenantId =
    process.env.G3N_PRESENTATION_TENANT_ID?.trim() || "c7ad2d88-2b7a-4a74-9d73-1e7c7a9f6c10";
  private readonly presentationSlug = (process.env.G3N_PRESENTATION_SLUG ?? "g3n-apresentacao").trim().toLowerCase();

  private resolverTenantId(tenantId?: string, instituicaoSlug?: string) {
    const tenant = this.parseTenantId(tenantId);
    const slug = instituicaoSlug?.trim().toLowerCase();
    if (slug && slug === this.presentationSlug) {
      return this.presentationTenantId;
    }
    return tenant;
  }

  async listar(rawFilters: unknown, tenantId?: string, instituicaoSlug?: string) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.listar(filtros, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async obter(rawId: string, tenantId?: string, instituicaoSlug?: string) {
    return this.repository.obter(this.parseId(rawId), this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async criar(rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const tenantObrigatorio = this.resolverTenantId(tenantId, instituicaoSlug);
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

  async atualizar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.atualizar(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async cancelar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const body = (rawInput ?? {}) as { motivo?: string };
    return this.repository.cancelar(this.parseId(rawId), body.motivo, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async excluir(rawId: string, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    return this.repository.excluir(this.parseId(rawId), usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async remarcar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoRemarcacaoInputSchema.parse(rawInput);
    return this.repository.remarcar(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async confirmar(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const body = (rawInput ?? {}) as { canal?: string; observacao?: string };
    return this.repository.confirmar(
      this.parseId(rawId),
      body.canal,
      body.observacao,
      usuario,
      this.resolverTenantId(tenantId, instituicaoSlug)
    );
  }

  async checkIn(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoCheckInInputSchema.parse(rawInput);
    return this.repository.checkIn(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async concluir(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoConclusaoInputSchema.parse(rawInput);
    return this.repository.concluir(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async listarListaEspera(tenantId?: string, instituicaoSlug?: string) {
    return this.repository.listarListaEspera(this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async criarListaEspera(rawInput: unknown, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoListaEsperaInputSchema.parse(rawInput);
    return this.repository.criarListaEspera(input, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async converterListaEspera(rawId: string, rawInput: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.converterListaEspera(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async indicadores(rawFilters: unknown, tenantId?: string, instituicaoSlug?: string) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.indicadores(filtros, this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async catalogos(tenantId?: string, instituicaoSlug?: string) {
    return this.repository.catalogos(this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async listarItens(rawTipo: unknown, rawBusca: unknown, tenantId?: string, instituicaoSlug?: string) {
    const tipo = String(rawTipo ?? "").trim().toLowerCase();
    if (!["curso", "atendimento", "oficina"].includes(tipo)) {
      throw new AppError("Tipo operacional invalido.", 400);
    }
    return this.repository.listarItensOperacionais(
      tipo as "curso" | "atendimento" | "oficina",
      typeof rawBusca === "string" ? rawBusca : undefined,
      this.resolverTenantId(tenantId, instituicaoSlug)
    );
  }

  async listarBeneficiarios(rawItemId: unknown, tenantId?: string, instituicaoSlug?: string) {
    const itemId = Number(rawItemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError("Item operacional invalido.", 400);
    }
    return this.repository.listarBeneficiariosOperacionais(BigInt(itemId), this.resolverTenantId(tenantId, instituicaoSlug));
  }

  async notificar(rawId: string, rawBody: unknown, usuario?: UsuarioActor, tenantId?: string, instituicaoSlug?: string) {
    const body = (rawBody ?? {}) as { canal?: string };
    const canal = String(body.canal ?? "").trim().toUpperCase();
    if (canal !== "WHATSAPP" && canal !== "EMAIL") {
      throw new AppError("Canal de notificacao invalido.", 400);
    }
    return this.repository.notificar(this.parseId(rawId), canal, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
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
