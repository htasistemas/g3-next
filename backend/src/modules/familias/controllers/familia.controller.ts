import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { FamiliaService } from "../services/familia.service.js";

const service = new FamiliaService();

export class FamiliaController {
  private buildAtor(request: AuthenticatedRequest) {
    return {
      id: request.authUser?.id,
      nomeUsuario: request.authUser?.nomeUsuario,
      tenant_id: request.authUser?.tenant_id,
      instituicao_id: request.authUser?.instituicao_id
    };
  }

  async listar(request: AuthenticatedRequest, response: Response) {
    const familias = await service.listar(request.query, this.buildAtor(request));
    return response.json({ familias });
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const familia = await service.buscarPorId(request.params.id, this.buildAtor(request));
    return response.json({ familia });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const familia = await service.criar(request.body, this.buildAtor(request));
    return response.status(201).json({ familia });
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const familia = await service.atualizar(request.params.id, request.body, this.buildAtor(request));
    return response.json({ familia });
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, this.buildAtor(request));
    return response.status(204).send();
  }

  async adicionarMembro(request: AuthenticatedRequest, response: Response) {
    const familia = await service.adicionarMembro(request.params.id, request.body, this.buildAtor(request));
    return response.json({ familia });
  }

  async atualizarMembro(request: AuthenticatedRequest, response: Response) {
    const familia = await service.atualizarMembro(
      request.params.id,
      request.params.membroId,
      request.body,
      this.buildAtor(request)
    );
    return response.json({ familia });
  }

  async removerMembro(request: AuthenticatedRequest, response: Response) {
    await service.removerMembro(request.params.id, request.params.membroId, this.buildAtor(request));
    return response.status(204).send();
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.listarHistorico(request.params.id, this.buildAtor(request));
    return response.json({ historico });
  }

  async listarAlertas(request: AuthenticatedRequest, response: Response) {
    const alertas = await service.listarAlertas(request.params.id, this.buildAtor(request));
    return response.json({ alertas });
  }

  async definirResponsavel(request: AuthenticatedRequest, response: Response) {
    const familia = await service.definirResponsavel(request.params.id, request.body, this.buildAtor(request));
    return response.json({ familia });
  }

  async atualizarEndereco(request: AuthenticatedRequest, response: Response) {
    const familia = await service.atualizarEndereco(request.params.id, request.body, this.buildAtor(request));
    return response.json({ familia });
  }

  async validarBeneficioFamiliar(request: AuthenticatedRequest, response: Response) {
    const validacao = await service.validarBeneficioFamiliar(request.params.id, request.query, this.buildAtor(request));
    return response.json(validacao);
  }

  async transferirMembro(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.transferirMembro(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }

  async desmembrarFamilia(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.desmembrarFamilia(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }
}
