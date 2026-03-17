import type { Response } from "express";
import { ParametrosSistemaService } from "../services/parametros-sistema.service.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";

const service = new ParametrosSistemaService();

export class ParametrosSistemaController {
  async obterPersonalizacao(_request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obterPersonalizacao();
    return response.json(resultado);
  }

  async atualizarPersonalizacao(request: AuthenticatedRequest, response: Response) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarPersonalizacao(request.body, usuario);
    return response.json(resultado);
  }

  async obterCarenciaDoacaoRealizada(_request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obterCarenciaDoacaoRealizada();
    return response.json(resultado);
  }

  async atualizarCarenciaDoacaoRealizada(request: AuthenticatedRequest, response: Response) {
    const usuario = request.authUser?.nomeUsuario ?? "sistema";
    const resultado = await service.atualizarCarenciaDoacaoRealizada(request.body, usuario);
    return response.json(resultado);
  }
}
