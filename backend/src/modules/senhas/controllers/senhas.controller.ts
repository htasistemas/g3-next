import type { Request, Response } from "express";
import { SenhasService } from "../services/senhas.service.js";

const service = new SenhasService();

export class SenhasController {
  async listarAguardando(request: Request, response: Response) {
    const lista = await service.listarAguardando(request.query.unidadeId as string | undefined);
    return response.json(lista);
  }

  async emitir(request: Request, response: Response) {
    const fila = await service.emitir(request.body);
    return response.status(201).json(fila);
  }

  async chamar(request: Request, response: Response) {
    const chamada = await service.chamar(request.body);
    return response.status(201).json(chamada);
  }

  async finalizar(request: Request, response: Response) {
    await service.finalizar(request.body);
    return response.status(204).send();
  }

  async finalizarFila(request: Request, response: Response) {
    await service.finalizarFila(String(request.query.filaId ?? ""));
    return response.status(204).send();
  }

  async painel(request: Request, response: Response) {
    const lista = await service.painel(
      request.query.unidadeId as string | undefined,
      request.query.limite as string | undefined
    );
    return response.json(lista);
  }

  async atual(request: Request, response: Response) {
    const chamada = await service.atual(request.query.unidadeId as string | undefined);
    return response.json(chamada);
  }

  async obterConfig(_request: Request, response: Response) {
    const config = await service.obterConfig();
    return response.json(config);
  }

  async atualizarConfig(request: Request, response: Response) {
    const config = await service.atualizarConfig(request.body);
    return response.json(config);
  }
}
