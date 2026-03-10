import type { Request, Response } from "express";
import { AlmoxarifadoService } from "../services/almoxarifado.service.js";

const service = new AlmoxarifadoService();

export class AlmoxarifadoController {
  async listarItens(_request: Request, response: Response) {
    const itens = await service.listarItens();
    return response.json({ itens });
  }

  async obterProximoCodigo(_request: Request, response: Response) {
    const codigo = await service.obterProximoCodigo();
    return response.json({ codigo });
  }

  async criarItem(request: Request, response: Response) {
    const item = await service.criarItem(request.body);
    return response.status(201).json(item);
  }

  async atualizarItem(request: Request, response: Response) {
    const item = await service.atualizarItem(request.params.id, request.body);
    return response.json(item);
  }

  async removerItem(request: Request, response: Response) {
    await service.removerItem(request.params.id);
    return response.status(204).send();
  }

  async listarMovimentacoes(_request: Request, response: Response) {
    const movimentacoes = await service.listarMovimentacoes();
    return response.json({ movimentacoes });
  }

  async registrarMovimentacao(request: Request, response: Response) {
    const resultado = await service.registrarMovimentacao(request.body);
    return response.status(201).json(resultado);
  }

  async listarComposicaoKit(request: Request, response: Response) {
    const itens = await service.listarComposicaoKit(request.params.id);
    return response.json(itens);
  }

  async atualizarComposicaoKit(request: Request, response: Response) {
    const itens = await service.atualizarComposicaoKit(request.params.id, request.body);
    return response.json(itens);
  }

  async listarVinculosKit(request: Request, response: Response) {
    const vinculos = await service.listarVinculosKit(request.params.id);
    return response.json(vinculos);
  }
}
