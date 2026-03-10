import type { Request, Response } from "express";
import { VisitasDomiciliaresService } from "../services/visitas-domiciliares.service.js";

const service = new VisitasDomiciliaresService();

export class VisitasDomiciliaresController {
  async listar(_request: Request, response: Response) {
    const visitas = await service.listar();
    return response.json({ visitas });
  }

  async criar(request: Request, response: Response) {
    const visita = await service.criar(request.body);
    return response.status(201).json(visita);
  }

  async atualizar(request: Request, response: Response) {
    const visita = await service.atualizar(request.params.id, request.body);
    return response.json(visita);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
