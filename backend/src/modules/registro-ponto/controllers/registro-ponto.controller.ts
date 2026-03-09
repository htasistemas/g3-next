import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { RegistroPontoService } from "../services/registro-ponto.service.js";

const service = new RegistroPontoService();

function obterIp(request: AuthenticatedRequest) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded;
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }

  return request.socket.remoteAddress ?? undefined;
}

function obterOrigem(request: AuthenticatedRequest) {
  const body = request.body as Record<string, unknown> | undefined;

  return {
    ip: obterIp(request),
    user_agent: request.headers["user-agent"],
    latitude: typeof body?.latitude === "number" ? body.latitude : undefined,
    longitude: typeof body?.longitude === "number" ? body.longitude : undefined,
    accuracy_metros:
      typeof body?.accuracy_metros === "number" ? body.accuracy_metros : undefined,
    origem_manual: typeof body?.origem_manual === "string" ? body.origem_manual : undefined
  };
}

export class RegistroPontoController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const registros = await service.listar(request.query, request.authUser ?? {});
    return response.json({ registros });
  }

  async listarEspelho(request: AuthenticatedRequest, response: Response) {
    const espelho = await service.listarEspelho(request.query, request.authUser ?? {});
    return response.json(espelho);
  }

  async listarUsuarios(request: AuthenticatedRequest, response: Response) {
    const usuarios = await service.listarUsuarios(request.query.termo);
    return response.json({ usuarios });
  }

  async marcarPonto(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const registro = await service.marcarPonto(request.body, request.authUser ?? {}, origem);
    return response.status(201).json(registro);
  }

  async ajustarRegistro(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const registro = await service.ajustarRegistro(
      request.params.id,
      request.body,
      request.authUser ?? {},
      origem
    );
    return response.json({ registro });
  }

  async adicionarOcorrencia(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const registro = await service.adicionarOcorrencia(
      request.params.id,
      request.body,
      request.authUser ?? {},
      origem
    );
    return response.json({ registro });
  }

  async buscarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.buscarHistorico(request.params.id, request.authUser ?? {});
    return response.json(historico);
  }
}
