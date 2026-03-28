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

  async listar(rawFilters: unknown) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.listar(filtros);
  }

  async obter(rawId: string) {
    return this.repository.obter(this.parseId(rawId));
  }

  async criar(rawInput: unknown, usuario?: UsuarioActor) {
    const body = rawInput as Record<string, unknown>;
    if (body && "itemId" in body && "tipo" in body && ("beneficiariosIds" in body || "matriculasIds" in body)) {
      const input = agendamentoOperacionalInputSchema.parse(rawInput);
      if (input.id) {
        return this.repository.atualizarOperacional(this.parseId(input.id), input, usuario);
      }
      return this.repository.criarOperacional(input, usuario);
    }
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.criar(input, usuario);
  }

  async atualizar(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.atualizar(this.parseId(rawId), input, usuario);
  }

  async cancelar(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const body = (rawInput ?? {}) as { motivo?: string };
    return this.repository.cancelar(this.parseId(rawId), body.motivo, usuario);
  }

  async remarcar(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const input = agendamentoRemarcacaoInputSchema.parse(rawInput);
    return this.repository.remarcar(this.parseId(rawId), input, usuario);
  }

  async confirmar(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const body = (rawInput ?? {}) as { canal?: string; observacao?: string };
    return this.repository.confirmar(this.parseId(rawId), body.canal, body.observacao, usuario);
  }

  async checkIn(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const input = agendamentoCheckInInputSchema.parse(rawInput);
    return this.repository.checkIn(this.parseId(rawId), input, usuario);
  }

  async concluir(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const input = agendamentoConclusaoInputSchema.parse(rawInput);
    return this.repository.concluir(this.parseId(rawId), input, usuario);
  }

  async listarListaEspera() {
    return this.repository.listarListaEspera();
  }

  async criarListaEspera(rawInput: unknown) {
    const input = agendamentoListaEsperaInputSchema.parse(rawInput);
    return this.repository.criarListaEspera(input);
  }

  async converterListaEspera(rawId: string, rawInput: unknown, usuario?: UsuarioActor) {
    const input = agendamentoInputSchema.parse(rawInput);
    return this.repository.converterListaEspera(this.parseId(rawId), input, usuario);
  }

  async indicadores(rawFilters: unknown) {
    const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
    return this.repository.indicadores(filtros);
  }

  async catalogos() {
    return this.repository.catalogos();
  }

  async listarItens(rawTipo: unknown, rawBusca: unknown) {
    const tipo = String(rawTipo ?? "").trim().toLowerCase();
    if (!["curso", "atendimento", "oficina"].includes(tipo)) {
      throw new AppError("Tipo operacional invalido.", 400);
    }
    return this.repository.listarItensOperacionais(tipo as "curso" | "atendimento" | "oficina", typeof rawBusca === "string" ? rawBusca : undefined);
  }

  async listarBeneficiarios(rawItemId: unknown) {
    const itemId = Number(rawItemId);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new AppError("Item operacional invalido.", 400);
    }
    return this.repository.listarBeneficiariosOperacionais(BigInt(itemId));
  }

  async notificar(rawId: string, rawBody: unknown, usuario?: UsuarioActor) {
    const body = (rawBody ?? {}) as { canal?: string };
    const canal = String(body.canal ?? "").trim().toUpperCase();
    if (canal !== "WHATSAPP" && canal !== "EMAIL") {
      throw new AppError("Canal de notificacao invalido.", 400);
    }
    return this.repository.notificar(this.parseId(rawId), canal, usuario);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }
}
