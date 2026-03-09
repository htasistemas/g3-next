import type { Request, Response } from "express";
import { DoacaoPlanejadaService } from "../services/doacao-planejada.service.js";

export class DoacaoPlanejadaController {
  private readonly service = new DoacaoPlanejadaService();

  async listar(request: Request, response: Response) {
    const doacoes = await this.service.listar(request.query);
    response.json({ doacoes });
  }

  async buscarPorId(request: Request, response: Response) {
    const doacao = await this.service.buscarPorId(request.params.id);
    response.json({ doacao });
  }

  async criar(request: Request, response: Response) {
    const doacao = await this.service.criar(request.body);
    response.status(201).json({ doacao });
  }

  async atualizar(request: Request, response: Response) {
    const doacao = await this.service.atualizar(request.params.id, request.body);
    response.json({ doacao });
  }

  async remover(request: Request, response: Response) {
    await this.service.remover(request.params.id);
    response.status(204).send();
  }
}

