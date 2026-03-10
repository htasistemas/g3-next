import type { Request, Response } from "express";
import { TransparenciasService } from "../services/transparencias.service.js";

const service = new TransparenciasService();

export class TransparenciasController {
  async listar(_request: Request, response: Response) {
    const transparencias = await service.listar();
    return response.json({ transparencias });
  }

  async obter(request: Request, response: Response) {
    const transparencia = await service.obter(request.params.id);
    return response.json({ transparencia });
  }

  async criar(request: Request, response: Response) {
    const transparencia = await service.criar(request.body);
    return response.status(201).json({ transparencia });
  }

  async atualizar(request: Request, response: Response) {
    const transparencia = await service.atualizar(request.params.id, request.body);
    return response.json({ transparencia });
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
