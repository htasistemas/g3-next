import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { EmprestimosEventosService } from "../services/emprestimos-eventos.service.js";

const service = new EmprestimosEventosService();

export class EmprestimosEventosController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const emprestimos = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ emprestimos });
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json(emprestimo);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(emprestimo);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(emprestimo);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.excluir(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async confirmarRetirada(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.confirmarRetirada(
      request.params.id,
      request.query.usuarioId,
      request.authUser?.tenant_id
    );
    return response.json(emprestimo);
  }

  async confirmarReserva(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.confirmarReserva(
      request.params.id,
      request.query.usuarioId,
      request.authUser?.tenant_id
    );
    return response.json(emprestimo);
  }

  async confirmarDevolucao(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.confirmarDevolucao(
      request.params.id,
      request.query.usuarioId,
      request.authUser?.tenant_id
    );
    return response.json(emprestimo);
  }

  async cancelar(request: AuthenticatedRequest, response: Response) {
    const emprestimo = await service.cancelar(
      request.params.id,
      request.query.usuarioId,
      request.authUser?.tenant_id
    );
    return response.json(emprestimo);
  }

  async enviarAlertaDevolucaoEmail(request: AuthenticatedRequest, response: Response) {
    const envio = await service.enviarAlertaDevolucaoEmail(
      request.params.id,
      request.authUser?.tenant_id
    );
    return response.json(envio);
  }

  async enviarConfirmacaoReservaEmail(request: AuthenticatedRequest, response: Response) {
    const envio = await service.enviarConfirmacaoReservaEmail(
      request.params.id,
      request.authUser?.tenant_id
    );
    return response.json(envio);
  }

  async obterPreviewConfirmacaoReservaEmail(request: AuthenticatedRequest, response: Response) {
    const preview = await service.obterPreviewConfirmacaoReservaEmail(
      request.params.id,
      request.authUser?.tenant_id
    );
    return response.json(preview);
  }

  async listarAgendaResumo(request: AuthenticatedRequest, response: Response) {
    const resumo = await service.listarAgendaResumo(
      request.query.inicio,
      request.query.fim,
      request.authUser?.tenant_id
    );
    return response.json(resumo);
  }

  async listarAgendaDia(request: AuthenticatedRequest, response: Response) {
    const dia = await service.listarAgendaDia(request.query.data, request.authUser?.tenant_id);
    return response.json(dia);
  }

  async consultarDisponibilidade(request: AuthenticatedRequest, response: Response) {
    const disponibilidade = await service.consultarDisponibilidade(
      request.query,
      request.authUser?.tenant_id
    );
    return response.json(disponibilidade);
  }

  async listarEventos(request: AuthenticatedRequest, response: Response) {
    const eventos = await service.listarEventos(request.authUser?.tenant_id);
    return response.json(eventos);
  }

  async listarResponsaveis(request: AuthenticatedRequest, response: Response) {
    const responsaveis = await service.listarResponsaveis(request.authUser?.tenant_id);
    return response.json(responsaveis);
  }

  async criarEvento(request: AuthenticatedRequest, response: Response) {
    const evento = await service.criarEvento(request.body, request.authUser?.tenant_id);
    return response.status(201).json(evento);
  }

  async atualizarEvento(request: AuthenticatedRequest, response: Response) {
    const evento = await service.atualizarEvento(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(evento);
  }

  async excluirEvento(request: AuthenticatedRequest, response: Response) {
    await service.excluirEvento(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async criarResponsavel(request: AuthenticatedRequest, response: Response) {
    const responsavel = await service.criarResponsavel(request.body, request.authUser?.tenant_id);
    return response.status(201).json(responsavel);
  }

  async atualizarResponsavel(request: AuthenticatedRequest, response: Response) {
    const responsavel = await service.atualizarResponsavel(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(responsavel);
  }

  async excluirResponsavel(request: AuthenticatedRequest, response: Response) {
    await service.excluirResponsavel(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarMovimentacoes(request: AuthenticatedRequest, response: Response) {
    const movimentacoes = await service.listarMovimentacoes(
      request.params.id,
      request.authUser?.tenant_id
    );
    return response.json({ movimentacoes });
  }
}
