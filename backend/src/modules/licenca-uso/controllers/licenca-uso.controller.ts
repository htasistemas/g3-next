import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { LicencaUsoService } from "../services/licenca-uso.service.js";

const service = new LicencaUsoService();

export class LicencaUsoController {
  async obterConfiguracao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obterConfiguracao(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async atualizarConfiguracao(request: AuthenticatedRequest, response: Response) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarConfiguracao(
      request.body,
      usuario,
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async gerarCheckout(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.gerarCheckoutLink(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async confirmarRetorno(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.confirmarPagamentoRetorno(request.body);
    return response.json(resultado);
  }

  async webhookInfinitePay(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.processarWebhookInfinitePay(request.body);
    return response.json(resultado);
  }
}
