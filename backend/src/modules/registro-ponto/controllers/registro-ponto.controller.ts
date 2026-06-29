import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { RegistroPontoService } from "../services/registro-ponto.service.js";
import { ReportsService } from "../../reports/services/reports.service.js";

const service = new RegistroPontoService();
const reportsService = new ReportsService();

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
    const usuarios = await service.listarUsuarios(request.query.termo, request.authUser ?? {});
    return response.json({ usuarios });
  }

  async buscarHorarioUsuario(request: AuthenticatedRequest, response: Response) {
    const configuracao = await service.buscarHorarioUsuario(request.authUser ?? {});
    return response.json(configuracao);
  }

  async salvarHorarioUsuario(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const configuracao = await service.salvarHorarioUsuario(request.body, request.authUser ?? {}, origem);
    return response.json(configuracao);
  }

  async buscarAlertaPendencia(request: AuthenticatedRequest, response: Response) {
    const alerta = await service.buscarAlertaPendencia(request.authUser ?? {});
    return response.json(alerta);
  }

  async buscarConfiguracaoHoraExtra(request: AuthenticatedRequest, response: Response) {
    const configuracao = await service.buscarConfiguracaoHoraExtra(request.authUser ?? {});
    return response.json(configuracao);
  }

  async salvarConfiguracaoHoraExtra(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const configuracao = await service.salvarConfiguracaoHoraExtra(
      request.body,
      request.authUser ?? {},
      origem
    );
    return response.json(configuracao);
  }

  async buscarFace(request: AuthenticatedRequest, response: Response) {
    const face = await service.buscarFaceUsuario(request.authUser ?? {});
    return response.json(face);
  }

  async salvarFace(request: AuthenticatedRequest, response: Response) {
    const face = await service.salvarFaceUsuario(request.body, request.authUser ?? {});
    return response.json(face);
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

  async listarHorasExtras(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarHorasExtras(request.query, request.authUser ?? {});
    return response.json(resultado);
  }

  async registrarCienciaHoraExtra(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const resultado = await service.registrarCienciaHoraExtra(
      request.params.id,
      request.body,
      request.authUser ?? {},
      origem
    );
    return response.json({ registro: resultado });
  }

  async decidirHoraExtra(request: AuthenticatedRequest, response: Response) {
    const origem = obterOrigem(request);
    const resultado = await service.decidirHoraExtra(
      request.params.id,
      request.body,
      request.authUser ?? {},
      origem
    );
    return response.json({ registro: resultado });
  }

  async listarRelatorioMensal(request: AuthenticatedRequest, response: Response) {
    const relatorio = await service.listarRelatorioMensal(request.query, request.authUser ?? {});
    return response.json(relatorio);
  }

  async exportarRelatorioMensal(request: AuthenticatedRequest, response: Response) {
    const formato = request.query.formato === "excel" ? "excel" : "pdf";
    const payload = {
      ...(request.query as Record<string, unknown>),
      ...(request.body as Record<string, unknown>)
    };
    const resultado = await service.exportarRelatorioMensal(payload, formato, request.authUser ?? {});

    return response
      .status(200)
      .type(resultado.contentType)
      .setHeader("Content-Disposition", `inline; filename="${resultado.filename}"`)
      .send(resultado.buffer);
  }

  async gerarEspelhoPontoPdf(request: AuthenticatedRequest, response: Response) {
    const payload = {
      ...(request.query as Record<string, unknown>),
      ...(request.body as Record<string, unknown>)
    };
    const resultado = await reportsService.gerarEspelhoPonto(payload, request.authUser);

    return response
      .status(200)
      .type("application/pdf")
      .setHeader("Content-Disposition", `inline; filename=\"${resultado.filename}\"`)
      .send(resultado.pdf);
  }
}
