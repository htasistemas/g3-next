import type { Request, Response } from "express";
import { TarefaAdministrativaService } from "../services/tarefa-administrativa.service.js";

const service = new TarefaAdministrativaService();

export class TarefaAdministrativaController {
  async listar(_request: Request, response: Response) {
    const tarefas = await service.listar();
    return response.json(tarefas);
  }

  async obterResumo(_request: Request, response: Response) {
    const resumo = await service.obterResumo();
    return response.json({ resumo });
  }

  async buscarPorId(request: Request, response: Response) {
    const tarefa = await service.buscarPorId(request.params.id);
    return response.json(tarefa);
  }

  async criar(request: Request, response: Response) {
    const tarefa = await service.criar(request.body);
    return response.status(201).json(tarefa);
  }

  async atualizar(request: Request, response: Response) {
    const tarefa = await service.atualizar(request.params.id, request.body);
    return response.json(tarefa);
  }

  async adicionarHistorico(request: Request, response: Response) {
    const tarefa = await service.adicionarHistorico(request.params.id, request.body);
    return response.json(tarefa);
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
