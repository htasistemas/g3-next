import type { Request, Response } from "express";
import { LembreteDiarioService } from "../services/lembrete-diario.service.js";

const service = new LembreteDiarioService();

export class LembreteDiarioController {
  async listar(request: Request, response: Response) {
    const lembretes = await service.listar(request.query.usuario_id);
    return response.json(lembretes);
  }

  async criar(request: Request, response: Response) {
    const lembrete = await service.criar(request.body);
    return response.status(201).json(lembrete);
  }

  async atualizar(request: Request, response: Response) {
    const lembrete = await service.atualizar(request.params.id, request.body);
    return response.json(lembrete);
  }

  async concluir(request: Request, response: Response) {
    const lembrete = await service.concluir(request.params.id);
    return response.json(lembrete);
  }

  async adiar(request: Request, response: Response) {
    const lembrete = await service.adiar(request.params.id, request.body);
    return response.json(lembrete);
  }

  async excluir(request: Request, response: Response) {
    await service.excluir(request.params.id);
    return response.status(204).send();
  }
}
