import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { LembreteDiarioService } from "../services/lembrete-diario.service.js";

const service = new LembreteDiarioService();

export class LembreteDiarioController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const lembretes = await service.listar(
      request.query.usuario_id,
      request.authUser?.tenant_id
    );
    return response.json(lembretes);
  }

  async obterResumo(request: AuthenticatedRequest, response: Response) {
    const resumo = await service.obterResumo(request.authUser?.id, request.authUser?.tenant_id);
    return response.json({ resumo });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const lembrete = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(lembrete);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const lembrete = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(lembrete);
  }

  async concluir(request: AuthenticatedRequest, response: Response) {
    const lembrete = await service.concluir(request.params.id, request.authUser?.tenant_id);
    return response.json(lembrete);
  }

  async adiar(request: AuthenticatedRequest, response: Response) {
    const lembrete = await service.adiar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(lembrete);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.excluir(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
