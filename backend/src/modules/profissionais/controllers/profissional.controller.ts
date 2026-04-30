import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ProfissionalService } from "../services/profissional.service.js";

const service = new ProfissionalService();

export class ProfissionalController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const profissionais = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ profissionais });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const profissional = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ profissional });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const profissional = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ profissional });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const profissional = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ profissional });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
