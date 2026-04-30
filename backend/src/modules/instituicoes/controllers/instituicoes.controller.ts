import type { Request, Response } from "express";
import { InstituicoesService } from "../services/instituicoes.service.js";

const service = new InstituicoesService();

export class InstituicoesController {
  async listar(_request: Request, response: Response) {
    const instituicoes = await service.listar();
    return response.json({ instituicoes });
  }

  async criar(request: Request, response: Response) {
    const instituicao = await service.criar(request.body);
    return response.status(201).json({ instituicao });
  }

  async atualizar(request: Request, response: Response) {
    const instituicao = await service.atualizar(request.params.id, request.body);
    return response.json({ instituicao });
  }

  async resetarAdmin(request: Request, response: Response) {
    const resultado = await service.resetarAdmin(request.params.id, request.body);
    return response.json(resultado);
  }
}
