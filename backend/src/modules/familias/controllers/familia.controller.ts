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
}
