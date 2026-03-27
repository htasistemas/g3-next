import type { Request, Response } from "express";
import { EmprestimosEventosService } from "../services/emprestimos-eventos.service.js";

const service = new EmprestimosEventosService();

export class EmprestimosEventosController {
  async listar(request: Request, response: Response) {
    const emprestimos = await service.listar(request.query);
    return response.json({ emprestimos });
  }

  async obter(request: Request, response: Response) {
    const emprestimo = await service.obter(request.params.id);
    return response.json(emprestimo);
  }

  async criar(request: Request, response: Response) {
    const emprestimo = await service.criar(request.body);
    return response.status(201).json(emprestimo);
  }

  async atualizar(request: Request, response: Response) {
    const emprestimo = await service.atualizar(request.params.id, request.body);
    return response.json(emprestimo);
  }

  async excluir(request: Request, response: Response) {
    await service.excluir(request.params.id);
    return response.status(204).send();
  }

  async confirmarRetirada(request: Request, response: Response) {
    const emprestimo = await service.confirmarRetirada(
      request.params.id,
      request.query.usuarioId
    );
    return response.json(emprestimo);
  }

  async confirmarDevolucao(request: Request, response: Response) {
    const emprestimo = await service.confirmarDevolucao(
      request.params.id,
      request.query.usuarioId
    );
    return response.json(emprestimo);
  }

  async cancelar(request: Request, response: Response) {
    const emprestimo = await service.cancelar(request.params.id, request.query.usuarioId);
    return response.json(emprestimo);
  }

  async listarAgendaResumo(request: Request, response: Response) {
    const resumo = await service.listarAgendaResumo(request.query.inicio, request.query.fim);
    return response.json(resumo);
  }

  async listarAgendaDia(request: Request, response: Response) {
    const dia = await service.listarAgendaDia(request.query.data);
    return response.json(dia);
  }

  async consultarDisponibilidade(request: Request, response: Response) {
    const disponibilidade = await service.consultarDisponibilidade(request.query);
    return response.json(disponibilidade);
  }

  async listarEventos(_request: Request, response: Response) {
    const eventos = await service.listarEventos();
    return response.json(eventos);
  }

  async listarResponsaveis(_request: Request, response: Response) {
    const responsaveis = await service.listarResponsaveis();
    return response.json(responsaveis);
  }

  async criarEvento(request: Request, response: Response) {
    const evento = await service.criarEvento(request.body);
    return response.status(201).json(evento);
  }

  async atualizarEvento(request: Request, response: Response) {
    const evento = await service.atualizarEvento(request.params.id, request.body);
    return response.json(evento);
  }

  async excluirEvento(request: Request, response: Response) {
    await service.excluirEvento(request.params.id);
    return response.status(204).send();
  }

  async criarResponsavel(request: Request, response: Response) {
    const responsavel = await service.criarResponsavel(request.body);
    return response.status(201).json(responsavel);
  }

  async atualizarResponsavel(request: Request, response: Response) {
    const responsavel = await service.atualizarResponsavel(request.params.id, request.body);
    return response.json(responsavel);
  }

  async excluirResponsavel(request: Request, response: Response) {
    await service.excluirResponsavel(request.params.id);
    return response.status(204).send();
  }

  async listarMovimentacoes(request: Request, response: Response) {
    const movimentacoes = await service.listarMovimentacoes(request.params.id);
    return response.json({ movimentacoes });
  }
}
