import type { Request, Response } from "express";
import { VoluntarioService } from "../services/voluntario.service.js";

const service = new VoluntarioService();

export class VoluntarioController {
  async listar(request: Request, response: Response) {
    const voluntarios = await service.listar(request.query);
    return response.json({ voluntarios });
  }

  async buscarPorId(request: Request, response: Response) {
    const voluntario = await service.buscarPorId(request.params.id);
    return response.json({ voluntario });
  }

  async criar(request: Request, response: Response) {
    const voluntario = await service.criar(request.body);
    return response.status(201).json({ voluntario });
  }

  async atualizar(request: Request, response: Response) {
    const voluntario = await service.atualizar(request.params.id, request.body);
    return response.json({ voluntario });
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id);
    return response.status(204).send();
  }
}
