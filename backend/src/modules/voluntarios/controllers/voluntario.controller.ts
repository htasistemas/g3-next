import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { VoluntarioService } from "../services/voluntario.service.js";

const service = new VoluntarioService();

export class VoluntarioController {
  async listar(request: Request, response: Response) {
    const voluntarios = await service.listar(request.query);
    return response.json({ voluntarios });
  }

  async buscarPorId(request: Request, response: Response) {
    const voluntario = await service.buscarPorId(request.params.id);
    return response.json({ voluntario });
  }

  async criar(request: Request, response: Response) {
    const voluntario = await service.criar(
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json({ voluntario });
  }

  async atualizar(request: Request, response: Response) {
    const voluntario = await service.atualizar(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json({ voluntario });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }
}
