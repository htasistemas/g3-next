import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { AlmoxarifadoService } from "../services/almoxarifado.service.js";

const service = new AlmoxarifadoService();

export class AlmoxarifadoController {
  async listarItens(request: AuthenticatedRequest, response: Response) {
    const itens = await service.listarItens(request.authUser?.tenant_id);
    return response.json({ itens });
  }

  async obterProximoCodigo(request: AuthenticatedRequest, response: Response) {
    const codigo = await service.obterProximoCodigo(request.authUser?.tenant_id);
    return response.json({ codigo });
  }

  async criarItem(request: AuthenticatedRequest, response: Response) {
    const item = await service.criarItem(request.body, request.authUser?.tenant_id);
    return response.status(201).json(item);
  }

  async atualizarItem(request: AuthenticatedRequest, response: Response) {
    const item = await service.atualizarItem(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(item);
  }

  async removerItem(request: AuthenticatedRequest, response: Response) {
    await service.removerItem(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarMovimentacoes(request: AuthenticatedRequest, response: Response) {
    const movimentacoes = await service.listarMovimentacoes(request.authUser?.tenant_id);
    return response.json({ movimentacoes });
  }

  async registrarMovimentacao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.registrarMovimentacao(request.body, request.authUser?.tenant_id);
    return response.status(201).json(resultado);
  }

  async listarComposicaoKit(request: AuthenticatedRequest, response: Response) {
    const itens = await service.listarComposicaoKit(request.params.id, request.authUser?.tenant_id);
    return response.json(itens);
  }

  async atualizarComposicaoKit(request: AuthenticatedRequest, response: Response) {
    const itens = await service.atualizarComposicaoKit(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(itens);
  }

  async listarVinculosKit(request: AuthenticatedRequest, response: Response) {
    const vinculos = await service.listarVinculosKit(
      request.params.id,
      request.authUser?.tenant_id
    );
    return response.json(vinculos);
  }
}
