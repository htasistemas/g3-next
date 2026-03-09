import type { Request, Response } from "express";
import { RegistroDoacaoService } from "../services/registro-doacao.service.js";

const service = new RegistroDoacaoService();

export class RegistroDoacaoController {
  async listar(request: Request, response: Response) {
    const registros = await service.listar(request.query);
    return response.json({ registros });
  }

  async buscarPorId(request: Request, response: Response) {
    const registro = await service.buscarPorId(request.params.id);
    return response.json({ registro });
  }

  async criar(request: Request, response: Response) {
    const registro = await service.criar(request.body);
    return response.status(201).json({ registro });
  }

  async atualizar(request: Request, response: Response) {
    const registro = await service.atualizar(request.params.id, request.body);
    return response.json({ registro });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }

  async listarDoadores(request: Request, response: Response) {
    const doadores = await service.listarDoadores(request.query.termo);
    return response.json({ doadores });
  }

  async criarDoador(request: Request, response: Response) {
    const doador = await service.criarDoador(request.body);
    return response.status(201).json({ doador });
  }

  async removerDoador(request: Request, response: Response) {
    await service.removerDoador(request.params.id);
    return response.status(204).send();
  }
}
