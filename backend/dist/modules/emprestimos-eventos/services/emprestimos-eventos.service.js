import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoEmprestimosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapEmprestimoToResponse, mapEventoEmprestimoToResponse, mapMovimentacaoToResponse, mapResponsavelEmprestimoToResponse } from "../emprestimos-eventos.mapper.js";
import { disponibilidadeQuerySchema, emprestimoEventoInputSchema, eventoEmprestimoInputSchema, responsavelEmprestimoInputSchema } from "../emprestimos-eventos.schema.js";
import { EmprestimosEventosRepository } from "../repositories/emprestimos-eventos.repository.js";
function parseDateOnly(rawValue, label) {
    if (typeof rawValue !== "string" || !rawValue.trim()) {
        throw new AppError(`${label} invalida.`, 400);
    }
    const parsed = new Date(`${rawValue.trim()}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError(`${label} invalida.`, 400);
    }
    return parsed;
}
export class EmprestimosEventosService {
    repository = new EmprestimosEventosRepository();
    async listar(rawQuery) {
        const filtros = this.normalizarPayload(rawQuery);
        const registros = await this.repository.listarEmprestimos({
            inicio: filtros.inicio,
            fim: filtros.fim,
            status: filtros.status,
            evento: filtros.evento,
            item: filtros.item,
            unidade: filtros.unidade
        });
        return registros.map((item) => mapEmprestimoToResponse(item.registro, item.itens));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async criar(rawInput) {
        const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criarEmprestimo(input);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async atualizar(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarEmprestimo(id, input);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async excluir(rawId) {
        const id = this.parseId(rawId);
        await this.repository.removerEmprestimo(id);
    }
    async confirmarRetirada(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const registro = await this.repository.alterarStatus(id, "RETIRADO", usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async confirmarDevolucao(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const registro = await this.repository.alterarStatus(id, "DEVOLVIDO", usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async cancelar(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const registro = await this.repository.alterarStatus(id, "CANCELADO", usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async listarEventos() {
        const eventos = await this.repository.listarEventos();
        return eventos.map(mapEventoEmprestimoToResponse);
    }
    async listarResponsaveis() {
        const responsaveis = await this.repository.listarResponsaveis();
        return responsaveis.map(mapResponsavelEmprestimoToResponse);
    }
    async criarEvento(rawInput) {
        const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criarEvento(input);
        return mapEventoEmprestimoToResponse(registro);
    }
    async atualizarEvento(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarEvento(id, input);
        return mapEventoEmprestimoToResponse(registro);
    }
    async excluirEvento(rawId) {
        const id = this.parseId(rawId);
        await this.repository.excluirEvento(id);
    }
    async criarResponsavel(rawInput) {
        const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.criarResponsavel(input);
        return mapResponsavelEmprestimoToResponse(registro);
    }
    async atualizarResponsavel(rawId, rawInput) {
        const id = this.parseId(rawId);
        const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarResponsavel(id, input);
        return mapResponsavelEmprestimoToResponse(registro);
    }
    async excluirResponsavel(rawId) {
        const id = this.parseId(rawId);
        await this.repository.excluirResponsavel(id);
    }
    async listarAgendaResumo(rawInicio, rawFim) {
        const inicio = parseDateOnly(rawInicio, "Data inicial");
        const fim = parseDateOnly(rawFim, "Data final");
        if (fim < inicio) {
            throw new AppError("Data final nao pode ser menor que a inicial.", 400);
        }
        return this.repository.listarAgendaResumo(inicio, fim);
    }
    async listarAgendaDia(rawData) {
        const data = parseDateOnly(rawData, "Data");
        const registros = await this.repository.listarAgendaDia(data);
        return registros.map((item) => {
            const emprestimo = mapEmprestimoToResponse(item.registro, item.itens);
            return {
                emprestimoId: emprestimo.id,
                status: emprestimo.status,
                periodo: {
                    retiradaPrevista: emprestimo.dataRetiradaPrevista,
                    devolucaoPrevista: emprestimo.dataDevolucaoPrevista,
                    retiradaReal: emprestimo.dataRetiradaReal,
                    devolucaoReal: emprestimo.dataDevolucaoReal
                },
                responsavel: emprestimo.responsavel,
                evento: emprestimo.evento,
                itens: emprestimo.itens ?? []
            };
        });
    }
    async consultarDisponibilidade(rawQuery) {
        const input = disponibilidadeQuerySchema.parse(rawQuery);
        return this.repository.consultarDisponibilidade({
            itemId: input.itemId,
            tipoItem: input.tipoItem,
            quantidade: input.quantidade,
            inicio: new Date(input.inicio),
            fim: new Date(input.fim),
            emprestimoId: input.emprestimoId
        });
    }
    async listarMovimentacoes(rawId) {
        const id = this.parseId(rawId);
        const registros = await this.repository.listarMovimentacoes(id);
        return registros.map(mapMovimentacaoToResponse);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseOptionalId(rawId) {
        if (rawId == null || rawId === "")
            return undefined;
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador de usuario invalido.", 400);
        }
        return parsed;
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoEmprestimosEventos);
    }
}
