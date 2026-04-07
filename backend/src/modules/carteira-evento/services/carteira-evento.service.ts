import { AppError } from "../../../shared/errors/app-error.js";
import { z } from "zod";
import {
  ajusteCarteiraInputSchema,
  barracaEventoFiltersSchema,
  barracaEventoInputSchema,
  dashboardCarteiraFiltersSchema,
  eventoCarteiraFiltersSchema,
  eventoCarteiraInputSchema,
  extratoCarteiraFiltersSchema,
  fechamentoCarteiraFiltersSchema,
  itemEventoFiltersSchema,
  itemEventoInputSchema,
  operacaoConsultaTokenSchema,
  operacaoVendaInputSchema,
  participanteCarteiraFiltersSchema,
  participanteCarteiraInputSchema,
  recargaCarteiraInputSchema,
  relatorioCarteiraFiltersSchema,
  transferenciaCarteiraInputSchema
} from "../carteira-evento.schema.js";
import type { CarteiraEventoAtor } from "../carteira-evento.types.js";
import { participanteCarteiraStatusValues } from "../carteira-evento.types.js";
import { CarteiraEventoRepository } from "../repositories/carteira-evento.repository.js";

export class CarteiraEventoService {
  private readonly repository = new CarteiraEventoRepository();

  listarEventos(rawFilters: unknown) {
    const filters = eventoCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.listarEventos(filters);
  }

  criarEvento(rawInput: unknown) {
    const input = eventoCarteiraInputSchema.parse(rawInput);
    return this.repository.criarEvento(input);
  }

  atualizarEvento(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId, "evento");
    const input = eventoCarteiraInputSchema.parse(rawInput);
    return this.repository.atualizarEvento(id, input);
  }

  listarParticipantes(rawFilters: unknown) {
    const filters = participanteCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.listarParticipantes(filters);
  }

  buscarParticipante(rawId: string) {
    return this.repository.buscarParticipantePorIdOuFalhar(this.parseId(rawId, "participante"));
  }

  criarParticipante(rawInput: unknown) {
    const input = participanteCarteiraInputSchema.parse(rawInput);
    return this.repository.criarParticipante(input);
  }

  atualizarParticipante(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId, "participante");
    const input = participanteCarteiraInputSchema.parse(rawInput);
    return this.repository.atualizarParticipante(id, input);
  }

  listarBarracas(rawFilters: unknown) {
    const filters = barracaEventoFiltersSchema.parse(rawFilters ?? {});
    return this.repository.listarBarracas(filters);
  }

  criarBarraca(rawInput: unknown) {
    const input = barracaEventoInputSchema.parse(rawInput);
    return this.repository.criarBarraca(input);
  }

  atualizarBarraca(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId, "barraca");
    const input = barracaEventoInputSchema.parse(rawInput);
    return this.repository.atualizarBarraca(id, input);
  }

  listarItens(rawFilters: unknown) {
    const filters = itemEventoFiltersSchema.parse(rawFilters ?? {});
    return this.repository.listarItens(filters);
  }

  criarItem(rawInput: unknown) {
    const input = itemEventoInputSchema.parse(rawInput);
    return this.repository.criarItem(input);
  }

  atualizarItem(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId, "item");
    const input = itemEventoInputSchema.parse(rawInput);
    return this.repository.atualizarItem(id, input);
  }

  recarregar(rawInput: unknown, ator: CarteiraEventoAtor) {
    const input = recargaCarteiraInputSchema.parse(rawInput);
    return this.repository.recarregar(input, ator);
  }

  transferir(rawInput: unknown, ator: CarteiraEventoAtor) {
    const input = transferenciaCarteiraInputSchema.parse(rawInput);
    return this.repository.transferir(input, ator);
  }

  ajustar(rawInput: unknown, ator: CarteiraEventoAtor) {
    const input = ajusteCarteiraInputSchema.parse(rawInput);
    return this.repository.ajustar(input, ator);
  }

  alterarStatusParticipante(rawId: string, rawInput: unknown, ator: CarteiraEventoAtor) {
    const id = this.parseId(rawId, "participante");
    const body = z.object({ status: z.enum(participanteCarteiraStatusValues) }).parse(rawInput ?? {});
    return this.repository.alterarStatusParticipante(id, body.status, ator);
  }

  emitirSegundaVia(rawId: string, rawInput: unknown, ator: CarteiraEventoAtor) {
    const id = this.parseId(rawId, "participante");
    const body = (rawInput ?? {}) as { invalidarAnterior?: boolean };
    return this.repository.emitirSegundaVia(id, !!body.invalidarAnterior, ator);
  }

  consultarToken(rawInput: unknown) {
    const input = operacaoConsultaTokenSchema.parse(rawInput);
    return this.repository.consultarToken(BigInt(input.evento_id), input.token);
  }

  realizarVenda(rawInput: unknown, ator: CarteiraEventoAtor) {
    const input = operacaoVendaInputSchema.parse(rawInput);
    return this.repository.realizarVenda(input, ator);
  }

  listarExtrato(rawFilters: unknown) {
    const filters = extratoCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.listarExtrato(filters);
  }

  obterDashboard(rawFilters: unknown) {
    const filters = dashboardCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.obterDashboard(filters);
  }

  obterFechamento(rawFilters: unknown) {
    const filters = fechamentoCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.obterFechamento(filters);
  }

  obterRelatorio(rawFilters: unknown) {
    const filters = relatorioCarteiraFiltersSchema.parse(rawFilters ?? {});
    return this.repository.obterRelatorio(filters);
  }

  private parseId(rawId: string, label: string) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(`Identificador de ${label} invalido.`, 400);
    }
    return BigInt(id);
  }
}
