import type { Request, Response } from "express";
import { UnidadeAssistencialService } from "../services/unidade-assistencial.service.js";

const service = new UnidadeAssistencialService();

export class UnidadeAssistencialController {
  async listar(request: Request, response: Response) {
    const unidades = await service.listar(request.query);
    return response.json({ unidades });
  }

  async buscarPorId(request: Request, response: Response) {
    const unidade = await service.buscarPorId(request.params.id);
    return response.json({ unidade });
  }

  async buscarAtual(_request: Request, response: Response) {
    const unidade = await service.buscarAtual();
    return response.json({ unidade });
  }

  async criar(request: Request, response: Response) {
    const unidade = await service.criar(request.body);
    return response.status(201).json({ unidade });
  }

  async atualizar(request: Request, response: Response) {
    const unidade = await service.atualizar(request.params.id, request.body);
    return response.json({ unidade });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
