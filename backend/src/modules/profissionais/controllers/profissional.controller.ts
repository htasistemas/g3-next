import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ProfissionalService } from "../services/profissional.service.js";

const service = new ProfissionalService();

export class ProfissionalController {
  async listar(request: Request, response: Response) {
    const profissionais = await service.listar(request.query);
    return response.json({ profissionais });
  }

  async buscarPorId(request: Request, response: Response) {
    const profissional = await service.buscarPorId(request.params.id);
    return response.json({ profissional });
  }

  async criar(request: Request, response: Response) {
    const profissional = await service.criar(
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json({ profissional });
  }

  async atualizar(request: Request, response: Response) {
    const profissional = await service.atualizar(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json({ profissional });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }
}
