import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { InformacoesAdministrativasService } from "../services/informacoes-administrativas.service.js";

export class InformacoesAdministrativasController {
  private readonly service = new InformacoesAdministrativasService();

  async listar(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.listar(request.body, request.authUser!);
    response.json(result);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.criar(request.body, request.authUser!);
    response.status(201).json(result);
  }

  async listarCategorias(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.listarCategorias(request.body, request.authUser!);
    response.json(result);
  }

  async criarCategoria(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.criarCategoria(request.body, request.authUser!);
    response.status(201).json(result);
  }

  async atualizarCategoria(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.atualizarCategoria(request.params.id, request.body, request.authUser!);
    response.json(result);
  }

  async removerCategoria(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.removerCategoria(request.params.id, request.body, request.authUser!);
    response.json(result);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.atualizar(request.params.id, request.body, request.authUser!);
    response.json(result);
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    const result = await this.service.remover(request.params.id, request.body, request.authUser!);
    response.json(result);
  }
}
