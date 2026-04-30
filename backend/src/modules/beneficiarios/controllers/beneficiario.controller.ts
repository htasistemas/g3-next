import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { BeneficiarioService } from "../services/beneficiario.service.js";

const service = new BeneficiarioService();

export class BeneficiarioController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const beneficiarios = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ beneficiarios });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const beneficiario = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ beneficiario });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const beneficiario = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ beneficiario });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const beneficiario = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json({ beneficiario });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async obterProximoCodigo(request: AuthenticatedRequest, response: Response) {
    const data = await service.obterProximoCodigo(request.authUser?.tenant_id);
    return response.json(data);
  }

  async obterSugestaoEndereco(request: AuthenticatedRequest, response: Response) {
    const sugestao = await service.obterSugestaoEndereco(request.query, request.authUser?.tenant_id);
    return response.json({ sugestao });
  }
}
