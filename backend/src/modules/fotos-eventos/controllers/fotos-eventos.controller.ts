import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { FotosEventosService } from "../services/fotos-eventos.service.js";

const service = new FotosEventosService();

export class FotosEventosController {
  async listar(request: Request, response: Response) {
    const resultado = await service.listar(request.query);
    return response.json(resultado);
  }

  async obter(request: Request, response: Response) {
    const resultado = await service.obter(request.params.id);
    return response.json(resultado);
  }

  async obterFotoPrincipal(request: Request, response: Response) {
    const arquivo = await service.obterFotoPrincipal(request.params.id);
    return response.json({ arquivo });
  }

  async criar(request: Request, response: Response) {
    const evento = await service.criar(
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json(evento);
  }

  async atualizar(request: Request, response: Response) {
    const evento = await service.atualizar(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json(evento);
  }

  async remover(request: Request, response: Response) {
    await service.remover(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }

  async adicionarFoto(request: Request, response: Response) {
    const foto = await service.adicionarFoto(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json(foto);
  }

  async atualizarFoto(request: Request, response: Response) {
    const foto = await service.atualizarFoto(request.params.id, request.params.fotoId, request.body);
    return response.json(foto);
  }

  async removerFoto(request: Request, response: Response) {
    await service.removerFoto(
      request.params.id,
      request.params.fotoId,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(204).send();
  }

  async obterArquivoFoto(request: Request, response: Response) {
    const arquivo = await service.obterArquivoFoto(request.params.id, request.params.fotoId);
    return response.json({ arquivo });
  }
}
