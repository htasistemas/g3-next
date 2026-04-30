import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { VisitasDomiciliaresService } from "../services/visitas-domiciliares.service.js";

const service = new VisitasDomiciliaresService();

export class VisitasDomiciliaresController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const visitas = await service.listar(request.authUser?.tenant_id);
    return response.json({ visitas });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const visita = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(visita);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const visita = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(visita);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
