import { EmprestimosEventosService } from "../services/emprestimos-eventos.service.js";
const service = new EmprestimosEventosService();
export class EmprestimosEventosController {
    async listar(request, response) {
        const emprestimos = await service.listar(request.query);
        return response.json({ emprestimos });
    }
    async obter(request, response) {
        const emprestimo = await service.obter(request.params.id);
        return response.json(emprestimo);
    }
    async criar(request, response) {
        const emprestimo = await service.criar(request.body);
        return response.status(201).json(emprestimo);
    }
    async atualizar(request, response) {
        const emprestimo = await service.atualizar(request.params.id, request.body);
        return response.json(emprestimo);
    }
    async excluir(request, response) {
        await service.excluir(request.params.id);
        return response.status(204).send();
    }
    async confirmarRetirada(request, response) {
        const emprestimo = await service.confirmarRetirada(request.params.id, request.query.usuarioId);
        return response.json(emprestimo);
    }
    async confirmarDevolucao(request, response) {
        const emprestimo = await service.confirmarDevolucao(request.params.id, request.query.usuarioId);
        return response.json(emprestimo);
    }
    async cancelar(request, response) {
        const emprestimo = await service.cancelar(request.params.id, request.query.usuarioId);
        return response.json(emprestimo);
    }
    async listarAgendaResumo(request, response) {
        const resumo = await service.listarAgendaResumo(request.query.inicio, request.query.fim);
        return response.json(resumo);
    }
    async listarAgendaDia(request, response) {
        const dia = await service.listarAgendaDia(request.query.data);
        return response.json(dia);
    }
    async consultarDisponibilidade(request, response) {
        const disponibilidade = await service.consultarDisponibilidade(request.query);
        return response.json(disponibilidade);
    }
    async listarEventos(_request, response) {
        const eventos = await service.listarEventos();
        return response.json(eventos);
    }
    async listarResponsaveis(_request, response) {
        const responsaveis = await service.listarResponsaveis();
        return response.json(responsaveis);
    }
    async criarEvento(request, response) {
        const evento = await service.criarEvento(request.body);
        return response.status(201).json(evento);
    }
    async atualizarEvento(request, response) {
        const evento = await service.atualizarEvento(request.params.id, request.body);
        return response.json(evento);
    }
    async excluirEvento(request, response) {
        await service.excluirEvento(request.params.id);
        return response.status(204).send();
    }
    async criarResponsavel(request, response) {
        const responsavel = await service.criarResponsavel(request.body);
        return response.status(201).json(responsavel);
    }
    async atualizarResponsavel(request, response) {
        const responsavel = await service.atualizarResponsavel(request.params.id, request.body);
        return response.json(responsavel);
    }
    async excluirResponsavel(request, response) {
        await service.excluirResponsavel(request.params.id);
        return response.status(204).send();
    }
    async listarMovimentacoes(request, response) {
        const movimentacoes = await service.listarMovimentacoes(request.params.id);
        return response.json({ movimentacoes });
    }
}
