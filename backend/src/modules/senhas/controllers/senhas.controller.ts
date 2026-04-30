import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { SenhasService } from "../services/senhas.service.js";

const service = new SenhasService();

export class SenhasController {
  async listarAguardando(request: AuthenticatedRequest, response: Response) {
    const lista = await service.listarAguardando(
      request.query.unidadeId as string | undefined,
      request.authUser?.tenant_id
    );
    return response.json(lista);
  }

  async emitir(request: AuthenticatedRequest, response: Response) {
    const fila = await service.emitir(request.body, request.authUser?.tenant_id);
    return response.status(201).json(fila);
  }

  async chamar(request: AuthenticatedRequest, response: Response) {
    const chamada = await service.chamar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(chamada);
  }

  async finalizar(request: AuthenticatedRequest, response: Response) {
    await service.finalizar(request.body, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async finalizarFila(request: AuthenticatedRequest, response: Response) {
    await service.finalizarFila(String(request.query.filaId ?? ""), request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async painel(request: AuthenticatedRequest, response: Response) {
    const lista = await service.painel(
      request.query.unidadeId as string | undefined,
      request.query.limite as string | undefined,
      request.authUser?.tenant_id
    );
    return response.json(lista);
  }

  async atual(request: AuthenticatedRequest, response: Response) {
    const chamada = await service.atual(
      request.query.unidadeId as string | undefined,
      request.authUser?.tenant_id
    );
    return response.json(chamada);
  }

  async obterConfig(request: AuthenticatedRequest, response: Response) {
    const config = await service.obterConfig(request.authUser?.tenant_id);
    return response.json(config);
  }

  async atualizarConfig(request: AuthenticatedRequest, response: Response) {
    const config = await service.atualizarConfig(request.body, request.authUser?.tenant_id);
    return response.json(config);
  }
}
