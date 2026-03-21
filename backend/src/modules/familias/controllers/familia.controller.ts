import type { Request, Response } from "express";
import { FamiliaService } from "../services/familia.service.js";

const service = new FamiliaService();

export class FamiliaController {
  async listar(request: Request, response: Response) {
    const familias = await service.listar(request.query);
    return response.json({ familias });
  }

  async buscarPorId(request: Request, response: Response) {
    const familia = await service.buscarPorId(request.params.id);
    return response.json({ familia });
  }

  async criar(request: Request, response: Response) {
    const familia = await service.criar(request.body);
    return response.status(201).json({ familia });
  }

  async atualizar(request: Request, response: Response) {
    const familia = await service.atualizar(request.params.id, request.body);
    return response.json({ familia });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async adicionarMembro(request: Request, response: Response) {
    const familia = await service.adicionarMembro(request.params.id, request.body);
    return response.json({ familia });
  }

  async atualizarMembro(request: Request, response: Response) {
    const familia = await service.atualizarMembro(
      request.params.id,
      request.params.membroId,
      request.body
    );
    return response.json({ familia });
  }

  async removerMembro(request: Request, response: Response) {
    await service.removerMembro(request.params.id, request.params.membroId);
    return response.status(204).send();
  }

  async listarHistorico(request: Request, response: Response) {
    const historico = await service.listarHistorico(request.params.id);
    return response.json({ historico });
  }

  async listarAlertas(request: Request, response: Response) {
    const alertas = await service.listarAlertas(request.params.id);
    return response.json({ alertas });
  }

  async definirResponsavel(request: Request, response: Response) {
    const familia = await service.definirResponsavel(request.params.id, request.body);
    return response.json({ familia });
  }

  async atualizarEndereco(request: Request, response: Response) {
    const familia = await service.atualizarEndereco(request.params.id, request.body);
    return response.json({ familia });
  }

  async validarBeneficioFamiliar(request: Request, response: Response) {
    const validacao = await service.validarBeneficioFamiliar(request.params.id, request.query);
    return response.json(validacao);
  }

  async transferirMembro(request: Request, response: Response) {
    const resultado = await service.transferirMembro(request.params.id, request.body);
    return response.json(resultado);
  }

  async desmembrarFamilia(request: Request, response: Response) {
    const resultado = await service.desmembrarFamilia(request.params.id, request.body);
    return response.json(resultado);
  }
}
