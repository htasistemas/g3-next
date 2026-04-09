import { AppError } from "../../../shared/errors/app-error.js";
import { z } from "zod";
import { ajusteCarteiraInputSchema, barracaEventoFiltersSchema, barracaEventoInputSchema, dashboardCarteiraFiltersSchema, eventoCarteiraFiltersSchema, eventoCarteiraInputSchema, extratoCarteiraFiltersSchema, fechamentoCarteiraFiltersSchema, itemEventoFiltersSchema, itemEventoInputSchema, operacaoConsultaTokenSchema, operacaoVendaInputSchema, participanteCarteiraFiltersSchema, participanteCarteiraInputSchema, recargaCarteiraInputSchema, relatorioCarteiraFiltersSchema, transferenciaCarteiraInputSchema } from "../carteira-evento.schema.js";
import { participanteCarteiraStatusValues } from "../carteira-evento.types.js";
import { CarteiraEventoRepository } from "../repositories/carteira-evento.repository.js";
export class CarteiraEventoService {
    repository = new CarteiraEventoRepository();
    listarEventos(rawFilters) {
        const filters = eventoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarEventos(filters);
    }
    criarEvento(rawInput) {
        const input = eventoCarteiraInputSchema.parse(rawInput);
        return this.repository.criarEvento(input);
    }
    atualizarEvento(rawId, rawInput) {
        const id = this.parseId(rawId, "evento");
        const input = eventoCarteiraInputSchema.parse(rawInput);
        return this.repository.atualizarEvento(id, input);
    }
    listarParticipantes(rawFilters) {
        const filters = participanteCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarParticipantes(filters);
    }
    buscarParticipante(rawId) {
        return this.repository.buscarParticipantePorIdOuFalhar(this.parseId(rawId, "participante"));
    }
    criarParticipante(rawInput) {
        const input = participanteCarteiraInputSchema.parse(rawInput);
        return this.repository.criarParticipante(input);
    }
    atualizarParticipante(rawId, rawInput) {
        const id = this.parseId(rawId, "participante");
        const input = participanteCarteiraInputSchema.parse(rawInput);
        return this.repository.atualizarParticipante(id, input);
    }
    listarBarracas(rawFilters) {
        const filters = barracaEventoFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarBarracas(filters);
    }
    criarBarraca(rawInput) {
        const input = barracaEventoInputSchema.parse(rawInput);
        return this.repository.criarBarraca(input);
    }
    atualizarBarraca(rawId, rawInput) {
        const id = this.parseId(rawId, "barraca");
        const input = barracaEventoInputSchema.parse(rawInput);
        return this.repository.atualizarBarraca(id, input);
    }
    listarItens(rawFilters) {
        const filters = itemEventoFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarItens(filters);
    }
    criarItem(rawInput) {
        const input = itemEventoInputSchema.parse(rawInput);
        return this.repository.criarItem(input);
    }
    atualizarItem(rawId, rawInput) {
        const id = this.parseId(rawId, "item");
        const input = itemEventoInputSchema.parse(rawInput);
        return this.repository.atualizarItem(id, input);
    }
    recarregar(rawInput, ator) {
        const input = recargaCarteiraInputSchema.parse(rawInput);
        return this.repository.recarregar(input, ator);
    }
    transferir(rawInput, ator) {
        const input = transferenciaCarteiraInputSchema.parse(rawInput);
        return this.repository.transferir(input, ator);
    }
    ajustar(rawInput, ator) {
        const input = ajusteCarteiraInputSchema.parse(rawInput);
        return this.repository.ajustar(input, ator);
    }
    alterarStatusParticipante(rawId, rawInput, ator) {
        const id = this.parseId(rawId, "participante");
        const body = z.object({ status: z.enum(participanteCarteiraStatusValues) }).parse(rawInput ?? {});
        return this.repository.alterarStatusParticipante(id, body.status, ator);
    }
    emitirSegundaVia(rawId, rawInput, ator) {
        const id = this.parseId(rawId, "participante");
        const body = (rawInput ?? {});
        return this.repository.emitirSegundaVia(id, !!body.invalidarAnterior, ator);
    }
    consultarToken(rawInput) {
        const input = operacaoConsultaTokenSchema.parse(rawInput);
        return this.repository.consultarToken(BigInt(input.evento_id), input.token);
    }
    realizarVenda(rawInput, ator) {
        const input = operacaoVendaInputSchema.parse(rawInput);
        return this.repository.realizarVenda(input, ator);
    }
    listarExtrato(rawFilters) {
        const filters = extratoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarExtrato(filters);
    }
    obterDashboard(rawFilters) {
        const filters = dashboardCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterDashboard(filters);
    }
    obterFechamento(rawFilters) {
        const filters = fechamentoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterFechamento(filters);
    }
    obterRelatorio(rawFilters) {
        const filters = relatorioCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterRelatorio(filters);
    }
    parseId(rawId, label) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError(`Identificador de ${label} invalido.`, 400);
        }
        return BigInt(id);
    }
}
