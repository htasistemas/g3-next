import type { Request, Response } from "express";
import { PatrimonioService } from "../services/patrimonio.service.js";

const service = new PatrimonioService();

export class PatrimonioController {
  async listar(_request: Request, response: Response) {
    const patrimonios = await service.listar();
    return response.json({ patrimonios });
  }

  async criar(request: Request, response: Response) {
    const patrimonio = await service.criar(request.body);
    return response.status(201).json({ patrimonio });
  }

  async atualizar(request: Request, response: Response) {
    const patrimonio = await service.atualizar(request.params.id, request.body);
    return response.json({ patrimonio });
  }

  async registrarMovimento(request: Request, response: Response) {
    const patrimonio = await service.registrarMovimento(request.params.id, request.body);
    return response.json({ patrimonio });
  }
}
