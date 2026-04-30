import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { RegistroDoacaoService } from "../services/registro-doacao.service.js";

const service = new RegistroDoacaoService();

export class RegistroDoacaoController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const registros = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ registros });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const registro = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ registro });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json({ registro });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const registro = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json({ registro });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarDoadores(request: AuthenticatedRequest, response: Response) {
    const doadores = await service.listarDoadores(request.query.termo, request.authUser?.tenant_id);
    return response.json({ doadores });
  }

  async criarDoador(request: AuthenticatedRequest, response: Response) {
    const doador = await service.criarDoador(request.body, request.authUser?.tenant_id);
    return response.status(201).json({ doador });
  }

  async removerDoador(request: AuthenticatedRequest, response: Response) {
    await service.removerDoador(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }
}
