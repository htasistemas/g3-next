import { AppError } from "../../../shared/errors/app-error.js";
import {
  agendamentoCheckInInputSchema,
  agendamentoConclusaoInputSchema,
  agendamentoFiltrosSchema,
  agendamentoInputSchema,
  agendamentoListaEsperaInputSchema,
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

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }
}
