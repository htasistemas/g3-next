import type { Request, Response } from "express";
import { DoacaoRealizadaService } from "../services/doacao-realizada.service.js";

const service = new DoacaoRealizadaService();

export class DoacaoRealizadaController {
  async listar(request: Request, response: Response) {
    const doacoes = await service.listar(request.query);
    return response.json({ doacoes });
  }

  async buscarPorId(request: Request, response: Response) {
    const doacao = await service.buscarPorId(request.params.id);
    return response.json({ doacao });
  }

  async criar(request: Request, response: Response) {
    const doacao = await service.criar(request.body);
    return response.status(201).json({ doacao });
  }

  async atualizar(request: Request, response: Response) {
    const doacao = await service.atualizar(request.params.id, request.body);
    return response.json({ doacao });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async listarBeneficiarios(request: Request, response: Response) {
    const beneficiarios = await service.listarBeneficiarios(request.query.termo);
    return response.json({ beneficiarios });
  }

  async listarFamilias(request: Request, response: Response) {
    const familias = await service.listarFamilias(request.query.termo);
    return response.json({ familias });
  }

  async listarItensEstoque(request: Request, response: Response) {
    const itens = await service.listarItensEstoque(request.query.termo);
    return response.json({ itens });
  }
}
