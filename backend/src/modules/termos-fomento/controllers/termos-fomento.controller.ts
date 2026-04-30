import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { TermosFomentoService } from "../services/termos-fomento.service.js";

const service = new TermosFomentoService();

export class TermosFomentoController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const termos = await service.listar(request.authUser?.tenant_id);
    return response.json(termos);
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const termo = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json(termo);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const termo = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(termo);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const termo = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(termo);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async adicionarAditivo(request: AuthenticatedRequest, response: Response) {
    const termo = await service.adicionarAditivo(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(termo);
  }
}
