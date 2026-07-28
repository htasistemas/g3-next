import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { TransparenciasService } from "../services/transparencias.service.js";

const service = new TransparenciasService();

export class TransparenciasController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const transparencias = await service.listar(request.authUser?.tenant_id);
    return response.json({ transparencias });
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const transparencia = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json({ transparencia });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const transparencia = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json({ transparencia });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const transparencia = await service.atualizar(request.params.id, request.body, request.authUser?.tenant_id, request.authUser);
    return response.json({ transparencia });
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async alterarWorkflow(request: AuthenticatedRequest, response: Response) {
    const transparencia = await service.alterarWorkflow(request.params.id, request.body, request.authUser);
    return response.json({ transparencia });
  }
}
