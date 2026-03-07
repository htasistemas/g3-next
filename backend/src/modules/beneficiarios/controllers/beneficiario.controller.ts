import type { Request, Response } from "express";
import { BeneficiarioService } from "../services/beneficiario.service.js";

const service = new BeneficiarioService();

export class BeneficiarioController {
  async listar(request: Request, response: Response) {
    const beneficiarios = await service.listar(request.query);
    return response.json({ beneficiarios });
  }

  async buscarPorId(request: Request, response: Response) {
    const beneficiario = await service.buscarPorId(request.params.id);
    return response.json({ beneficiario });
  }

  async criar(request: Request, response: Response) {
    const beneficiario = await service.criar(request.body);
    return response.status(201).json({ beneficiario });
  }

  async atualizar(request: Request, response: Response) {
    const beneficiario = await service.atualizar(request.params.id, request.body);
    return response.json({ beneficiario });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async obterProximoCodigo(_request: Request, response: Response) {
    const data = await service.obterProximoCodigo();
    return response.json(data);
  }
}
