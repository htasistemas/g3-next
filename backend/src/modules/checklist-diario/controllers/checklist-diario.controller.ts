import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ChecklistDiarioService } from "../services/checklist-diario.service.js";

const service = new ChecklistDiarioService();

export class ChecklistDiarioController {
  async listarExecucoes(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.listarExecucoes(request.query, request.authUser!));
  }

  async listarSemana(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.listarSemana(request.query, request.authUser!));
  }

  async obterIndicadores(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.obterIndicadores(request.query, request.authUser!));
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.listarHistorico(request.query, request.authUser!));
  }

  async obterExecucao(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.obterExecucao(request.params.id, request.authUser!));
  }

  async concluir(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.concluir(request.params.id, request.body, request.authUser!));
  }

  async dispensar(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.dispensar(request.params.id, request.body, request.authUser!));
  }

  async marcarNaoSeAplica(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.marcarNaoSeAplica(request.params.id, request.body, request.authUser!));
  }

  async reabrir(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.reabrir(request.params.id, request.body, request.authUser!));
  }

  async listarModelos(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.listarModelos(request.authUser!));
  }

  async criarModelo(request: AuthenticatedRequest, response: Response) {
    return response.status(201).json(await service.salvarModelo(undefined, request.body, request.authUser!));
  }

  async atualizarModelo(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.salvarModelo(request.params.id, request.body, request.authUser!));
  }

  async clonarModelo(request: AuthenticatedRequest, response: Response) {
    return response.status(201).json(await service.clonarModelo(request.params.id, request.authUser!));
  }

  async atualizarStatusModelo(request: AuthenticatedRequest, response: Response) {
    await service.atualizarStatusModelo(request.params.id, !!request.body?.ativo, request.authUser!);
    return response.status(204).send();
  }

  async gerarSemana(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.gerarSemana(request.body, request.authUser!));
  }

  async obterConfiguracao(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.obterConfiguracao(request.authUser!));
  }

  async atualizarConfiguracao(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.atualizarConfiguracao(request.body, request.authUser!));
  }
}
