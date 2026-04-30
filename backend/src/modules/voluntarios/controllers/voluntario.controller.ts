import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { VoluntarioService } from "../services/voluntario.service.js";

const service = new VoluntarioService();

export class VoluntarioController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const voluntarios = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ voluntarios });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const voluntario = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ voluntario });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const voluntario = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ voluntario });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const voluntario = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ voluntario });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
