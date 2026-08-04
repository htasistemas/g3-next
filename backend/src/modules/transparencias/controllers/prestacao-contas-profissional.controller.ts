import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { PrestacaoContasProfissionalService } from "../services/prestacao-contas-profissional.service.js";

const service = new PrestacaoContasProfissionalService();

export class PrestacaoContasProfissionalController {
  async visaoGeral(request: AuthenticatedRequest, response: Response) {
    const dados = await service.visaoGeral(request.authUser);
    return response.json({ dados });
  }

  async listar(request: AuthenticatedRequest, response: Response) {
    const registros = await service.listar(request.params.entidade, request.authUser);
    return response.json({ registros });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const registro = await service.criar(
      request.params.entidade,
      request.body,
      request.authUser,
      request.ip
    );
    return response.status(201).json({ registro });
  }

  async auditoria(request: AuthenticatedRequest, response: Response) {
    const registros = await service.listarAuditoria(request.authUser);
    return response.json({ registros });
  }

  async listarConfiguracoesIa(request: AuthenticatedRequest, response: Response) {
    const registros = await service.obterConfiguracoesIa(request.authUser);
    return response.json({ registros });
  }

  async salvarConfiguracaoIa(request: AuthenticatedRequest, response: Response) {
    const registro = await service.salvarConfiguracaoIa(request.body, request.authUser, request.ip);
    return response.json({ registro });
  }

  async testarConfiguracaoIa(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.testarConfiguracaoIa(request.body, request.authUser, request.ip);
    return response.json({ resultado });
  }

  async analisarDocumento(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.analisarDocumento(request.body, request.authUser, request.ip);
    return response.json({ resultado });
  }

  async assistente(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.assistente(request.body, request.authUser, request.ip);
    return response.json({ resultado });
  }
}
