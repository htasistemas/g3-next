import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { TarefaAdministrativaService } from "../services/tarefa-administrativa.service.js";

const service = new TarefaAdministrativaService();

export class TarefaAdministrativaController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const tarefas = await service.listar(request.authUser?.tenant_id);
    return response.json(tarefas);
  }

  async obterResumo(request: AuthenticatedRequest, response: Response) {
    const resumo = await service.obterResumo(request.authUser?.tenant_id);
    return response.json({ resumo });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json(tarefa);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(tarefa);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(tarefa);
  }

  async adicionarHistorico(request: AuthenticatedRequest, response: Response) {
    const tarefa = await service.adicionarHistorico(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(tarefa);
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
