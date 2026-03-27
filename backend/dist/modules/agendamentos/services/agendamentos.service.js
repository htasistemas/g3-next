import { AppError } from "../../../shared/errors/app-error.js";
import { agendamentoCheckInInputSchema, agendamentoConclusaoInputSchema, agendamentoFiltrosSchema, agendamentoInputSchema, agendamentoListaEsperaInputSchema, agendamentoRemarcacaoInputSchema } from "../agendamentos.schema.js";
import { AgendamentosRepository } from "../repositories/agendamentos.repository.js";
export class AgendamentosService {
    repository = new AgendamentosRepository();
    async listar(rawFilters) {
        const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
        return this.repository.listar(filtros);
    }
    async obter(rawId) {
        return this.repository.obter(this.parseId(rawId));
    }
    async criar(rawInput, usuario) {
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.criar(input, usuario);
    }
    async atualizar(rawId, rawInput, usuario) {
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.atualizar(this.parseId(rawId), input, usuario);
    }
    async cancelar(rawId, rawInput, usuario) {
        const body = (rawInput ?? {});
        return this.repository.cancelar(this.parseId(rawId), body.motivo, usuario);
    }
    async remarcar(rawId, rawInput, usuario) {
        const input = agendamentoRemarcacaoInputSchema.parse(rawInput);
        return this.repository.remarcar(this.parseId(rawId), input, usuario);
    }
    async confirmar(rawId, rawInput, usuario) {
        const body = (rawInput ?? {});
        return this.repository.confirmar(this.parseId(rawId), body.canal, body.observacao, usuario);
    }
    async checkIn(rawId, rawInput, usuario) {
        const input = agendamentoCheckInInputSchema.parse(rawInput);
        return this.repository.checkIn(this.parseId(rawId), input, usuario);
    }
    async concluir(rawId, rawInput, usuario) {
        const input = agendamentoConclusaoInputSchema.parse(rawInput);
        return this.repository.concluir(this.parseId(rawId), input, usuario);
    }
    async listarListaEspera() {
        return this.repository.listarListaEspera();
    }
    async criarListaEspera(rawInput) {
        const input = agendamentoListaEsperaInputSchema.parse(rawInput);
        return this.repository.criarListaEspera(input);
    }
    async converterListaEspera(rawId, rawInput, usuario) {
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.converterListaEspera(this.parseId(rawId), input, usuario);
    }
    async indicadores(rawFilters) {
        const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
        return this.repository.indicadores(filtros);
    }
    async catalogos() {
        return this.repository.catalogos();
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
