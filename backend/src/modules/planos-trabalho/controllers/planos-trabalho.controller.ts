import type { Request, Response } from "express";
import { PlanosTrabalhoService } from "../services/planos-trabalho.service.js";

const service = new PlanosTrabalhoService();

export class PlanosTrabalhoController {
  async listar(_request: Request, response: Response) {
    const planos = await service.listar();
    return response.json({ planos });
  }

  async obter(request: Request, response: Response) {
    const plano = await service.obter(request.params.id);
    return response.json({ plano });
  }

  async criar(request: Request, response: Response) {
    const plano = await service.criar(request.body);
    return response.status(201).json({ plano });
  }

  async atualizar(request: Request, response: Response) {
    const plano = await service.atualizar(request.params.id, request.body);
    return response.json({ plano });
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
