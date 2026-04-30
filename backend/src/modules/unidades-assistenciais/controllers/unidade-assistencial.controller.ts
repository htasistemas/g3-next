import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { UnidadeAssistencialService } from "../services/unidade-assistencial.service.js";

const service = new UnidadeAssistencialService();

export class UnidadeAssistencialController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const unidades = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ unidades });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const unidade = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ unidade });
  }

  async buscarAtual(request: AuthenticatedRequest, response: Response) {
    const unidade = await service.buscarAtual(request.authUser?.tenant_id);
    return response.json({ unidade });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const unidade = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ unidade });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const unidade = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ unidade });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
