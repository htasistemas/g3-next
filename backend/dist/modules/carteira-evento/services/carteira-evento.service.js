import { AppError } from "../../../shared/errors/app-error.js";
import { z } from "zod";
import { ajusteCarteiraInputSchema, barracaEventoFiltersSchema, barracaEventoInputSchema, dashboardCarteiraFiltersSchema, eventoCarteiraFiltersSchema, eventoCarteiraInputSchema, extratoCarteiraFiltersSchema, fechamentoCarteiraFiltersSchema, itemEventoFiltersSchema, itemEventoInputSchema, operacaoConsultaTokenSchema, operacaoVendaInputSchema, participanteCarteiraFiltersSchema, participanteCarteiraInputSchema, recargaCarteiraInputSchema, relatorioCarteiraFiltersSchema, transferenciaCarteiraInputSchema } from "../carteira-evento.schema.js";
import { participanteCarteiraStatusValues } from "../carteira-evento.types.js";
import { CarteiraEventoRepository } from "../repositories/carteira-evento.repository.js";
export class CarteiraEventoService {
    repository = new CarteiraEventoRepository();
    listarEventos(rawFilters, rawTenantId) {
        const filters = eventoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarEventos(filters, this.parseTenant(rawTenantId));
    }
    criarEvento(rawInput, rawTenantId) {
        const input = eventoCarteiraInputSchema.parse(rawInput);
        return this.repository.criarEvento(input, this.parseTenant(rawTenantId));
    }
    atualizarEvento(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId, "evento");
        const input = eventoCarteiraInputSchema.parse(rawInput);
        return this.repository.atualizarEvento(id, input, this.parseTenant(rawTenantId));
    }
    listarParticipantes(rawFilters, rawTenantId) {
        const filters = participanteCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarParticipantes(filters, this.parseTenant(rawTenantId));
    }
    buscarParticipante(rawId, rawTenantId) {
        return this.repository.buscarParticipantePorIdOuFalhar(this.parseId(rawId, "participante"), this.parseTenant(rawTenantId));
    }
    criarParticipante(rawInput, rawTenantId) {
        const input = participanteCarteiraInputSchema.parse(rawInput);
        return this.repository.criarParticipante(input, this.parseTenant(rawTenantId));
    }
    atualizarParticipante(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId, "participante");
        const input = participanteCarteiraInputSchema.parse(rawInput);
        return this.repository.atualizarParticipante(id, input, this.parseTenant(rawTenantId));
    }
    listarBarracas(rawFilters, rawTenantId) {
        const filters = barracaEventoFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarBarracas(filters, this.parseTenant(rawTenantId));
    }
    criarBarraca(rawInput, rawTenantId) {
        const input = barracaEventoInputSchema.parse(rawInput);
        return this.repository.criarBarraca(input, this.parseTenant(rawTenantId));
    }
    atualizarBarraca(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId, "barraca");
        const input = barracaEventoInputSchema.parse(rawInput);
        return this.repository.atualizarBarraca(id, input, this.parseTenant(rawTenantId));
    }
    listarItens(rawFilters, rawTenantId) {
        const filters = itemEventoFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarItens(filters, this.parseTenant(rawTenantId));
    }
    criarItem(rawInput, rawTenantId) {
        const input = itemEventoInputSchema.parse(rawInput);
        return this.repository.criarItem(input, this.parseTenant(rawTenantId));
    }
    atualizarItem(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId, "item");
        const input = itemEventoInputSchema.parse(rawInput);
        return this.repository.atualizarItem(id, input, this.parseTenant(rawTenantId));
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
    consultarToken(rawInput, rawTenantId) {
        const input = operacaoConsultaTokenSchema.parse(rawInput);
        return this.repository.consultarToken(BigInt(input.evento_id), input.token, this.parseTenant(rawTenantId));
    }
    realizarVenda(rawInput, ator) {
        const input = operacaoVendaInputSchema.parse(rawInput);
        return this.repository.realizarVenda(input, ator);
    }
    listarExtrato(rawFilters, rawTenantId) {
        const filters = extratoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.listarExtrato(filters, this.parseTenant(rawTenantId));
    }
    obterDashboard(rawFilters, rawTenantId) {
        const filters = dashboardCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterDashboard(filters, this.parseTenant(rawTenantId));
    }
    obterFechamento(rawFilters, rawTenantId) {
        const filters = fechamentoCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterFechamento(filters, this.parseTenant(rawTenantId));
    }
    obterRelatorio(rawFilters, rawTenantId) {
        const filters = relatorioCarteiraFiltersSchema.parse(rawFilters ?? {});
        return this.repository.obterRelatorio(filters, this.parseTenant(rawTenantId));
    }
    parseId(rawId, label) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError(`Identificador de ${label} invalido.`, 400);
        }
        return BigInt(id);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
