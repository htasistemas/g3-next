import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ProntuarioService } from "../services/prontuario.service.js";

const service = new ProntuarioService();

export class ProntuarioController {
  async buscarBeneficiarios(request: AuthenticatedRequest, response: Response) {
    return response.json({ beneficiarios: await service.buscarBeneficiarios(request.query, request.authUser?.tenant_id) });
  }

  async obterContexto(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser) return response.status(401).json({ message: "Não autenticado." });
    return response.json(await service.obterContexto(request.params.beneficiarioId, request.authUser));
  }

  async criarAtendimento(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser) return response.status(401).json({ message: "Não autenticado." });
    return response.status(201).json({ atendimento: await service.criarAtendimento(request.params.beneficiarioId, request.body, request.authUser) });
  }

  async atualizarAtendimento(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser) return response.status(401).json({ message: "Não autenticado." });
    return response.json({ atendimento: await service.atualizarAtendimento(request.params.id, request.body, request.authUser) });
  }

  async finalizarAtendimento(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser) return response.status(401).json({ message: "Não autenticado." });
    return response.json({ atendimento: await service.finalizarAtendimento(request.params.id, request.authUser) });
  }

  async criarAdendo(request: AuthenticatedRequest, response: Response) {
    if (!request.authUser) return response.status(401).json({ message: "Não autenticado." });
    return response.status(201).json({ atendimento: await service.criarAdendo(request.params.id, request.body, request.authUser) });
  }
}
