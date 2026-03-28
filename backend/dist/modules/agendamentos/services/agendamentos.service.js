import { AppError } from "../../../shared/errors/app-error.js";
import { agendamentoCheckInInputSchema, agendamentoConclusaoInputSchema, agendamentoFiltrosSchema, agendamentoInputSchema, agendamentoListaEsperaInputSchema, agendamentoOperacionalInputSchema, agendamentoRemarcacaoInputSchema } from "../agendamentos.schema.js";
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
        const body = rawInput;
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
    async listarItens(rawTipo, rawBusca) {
        const tipo = String(rawTipo ?? "").trim().toLowerCase();
        if (!["curso", "atendimento", "oficina"].includes(tipo)) {
            throw new AppError("Tipo operacional invalido.", 400);
        }
        return this.repository.listarItensOperacionais(tipo, typeof rawBusca === "string" ? rawBusca : undefined);
    }
    async listarBeneficiarios(rawItemId) {
        const itemId = Number(rawItemId);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            throw new AppError("Item operacional invalido.", 400);
        }
        return this.repository.listarBeneficiariosOperacionais(BigInt(itemId));
    }
    async notificar(rawId, rawBody, usuario) {
        const body = (rawBody ?? {});
        const canal = String(body.canal ?? "").trim().toUpperCase();
        if (canal !== "WHATSAPP" && canal !== "EMAIL") {
            throw new AppError("Canal de notificacao invalido.", 400);
        }
        return this.repository.notificar(this.parseId(rawId), canal, usuario);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
