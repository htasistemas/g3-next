import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DoacaoPlanejadaService } from "../services/doacao-planejada.service.js";

export class DoacaoPlanejadaController {
  private readonly service = new DoacaoPlanejadaService();

  async listar(request: AuthenticatedRequest, response: Response) {
    const doacoes = await this.service.listar(request.query, request.authUser?.tenant_id);
    response.json({ doacoes });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const doacao = await this.service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    response.json({ doacao });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const doacao = await this.service.criar(request.body, request.authUser?.tenant_id);
    response.status(201).json({ doacao });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const doacao = await this.service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    response.json({ doacao });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await this.service.remover(request.params.id, request.authUser?.tenant_id);
    response.status(204).send();
  }
}

