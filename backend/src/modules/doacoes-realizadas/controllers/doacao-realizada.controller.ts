import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DoacaoRealizadaService } from "../services/doacao-realizada.service.js";

const service = new DoacaoRealizadaService();

export class DoacaoRealizadaController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const doacoes = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json({ doacoes });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const doacao = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ doacao });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const doacao = await service.criar(request.body, request.authUser);
    return response.status(201).json({ doacao });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const doacao = await service.atualizar(request.params.id, request.body, request.authUser);
    return response.json({ doacao });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarBeneficiarios(request: AuthenticatedRequest, response: Response) {
    const beneficiarios = await service.listarBeneficiarios(
      request.query.termo,
      request.authUser?.tenant_id
    );
    return response.json({ beneficiarios });
  }

  async listarFamilias(request: AuthenticatedRequest, response: Response) {
    const familias = await service.listarFamilias(request.query.termo, request.authUser?.tenant_id);
    return response.json({ familias });
  }

  async listarItensEstoque(request: AuthenticatedRequest, response: Response) {
    const itens = await service.listarItensEstoque(request.query.termo, request.authUser?.tenant_id);
    return response.json({ itens });
  }
}
