import type { Request, Response } from "express";
import { VendaService } from "../services/venda.service.js";

export class VendaController {
  private readonly service = new VendaService();

  async listar(request: Request, response: Response) {
    const resultado = await this.service.listar(request.query);
    return response.json({ vendas: resultado });
  }

  async buscarPorId(request: Request, response: Response) {
    const resultado = await this.service.buscarPorId(request.params.id);
    return response.json(resultado);
  }

  async criar(request: Request, response: Response) {
    const resultado = await this.service.criar(request.body);
    return response.status(201).json(resultado);
  }
}
