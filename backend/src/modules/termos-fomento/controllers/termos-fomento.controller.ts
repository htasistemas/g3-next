import type { Request, Response } from "express";
import { TermosFomentoService } from "../services/termos-fomento.service.js";

const service = new TermosFomentoService();

export class TermosFomentoController {
  async listar(_request: Request, response: Response) {
    const termos = await service.listar();
    return response.json(termos);
  }

  async obter(request: Request, response: Response) {
    const termo = await service.obter(request.params.id);
    return response.json(termo);
  }

  async criar(request: Request, response: Response) {
    const termo = await service.criar(request.body);
    return response.status(201).json(termo);
  }

  async atualizar(request: Request, response: Response) {
    const termo = await service.atualizar(request.params.id, request.body);
    return response.json(termo);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async adicionarAditivo(request: Request, response: Response) {
    const termo = await service.adicionarAditivo(request.params.id, request.body);
    return response.json(termo);
  }
}
