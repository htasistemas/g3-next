import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { PatrimonioService } from "../services/patrimonio.service.js";

const service = new PatrimonioService();

export class PatrimonioController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const patrimonios = await service.listar(request.authUser?.tenant_id);
    return response.json({ patrimonios });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const patrimonio = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json({ patrimonio });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const patrimonio = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json({ patrimonio });
  }

  async registrarMovimento(request: AuthenticatedRequest, response: Response) {
    const patrimonio = await service.registrarMovimento(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json({ patrimonio });
  }
}
