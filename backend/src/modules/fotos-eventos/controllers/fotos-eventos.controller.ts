import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { FotosEventosService } from "../services/fotos-eventos.service.js";

const service = new FotosEventosService();

export class FotosEventosController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listar(request.query, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async resumo(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.resumo(request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json(resultado);
  }

  async obterFotoPrincipal(request: AuthenticatedRequest, response: Response) {
    const arquivo = await service.obterFotoPrincipal(request.params.id, request.authUser?.tenant_id);
    return response.json({ arquivo });
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const evento = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json(evento);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const evento = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json(evento);
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async removerEmLote(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.removerEmLote(
      request.body?.ids,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async adicionarFoto(request: AuthenticatedRequest, response: Response) {
    const foto = await service.adicionarFoto(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json(foto);
  }

  async adicionarFotosLote(request: AuthenticatedRequest, response: Response) {
    const fotos = await service.adicionarFotosLote(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json({ fotos });
  }

  async definirFotoPrincipal(request: AuthenticatedRequest, response: Response) {
    const foto = await service.definirFotoPrincipal(
      request.params.id,
      request.params.fotoId,
      request.authUser?.tenant_id
    );
    return response.json(foto);
  }

  async reordenarFotos(request: AuthenticatedRequest, response: Response) {
    const fotos = await service.reordenarFotos(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json({ fotos });
  }

  async atualizarFoto(request: AuthenticatedRequest, response: Response) {
    const foto = await service.atualizarFoto(
      request.params.id,
      request.params.fotoId,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(foto);
  }

  async removerFoto(request: AuthenticatedRequest, response: Response) {
    await service.removerFoto(
      request.params.id,
      request.params.fotoId,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(204).send();
  }

  async obterArquivoFoto(request: AuthenticatedRequest, response: Response) {
    const arquivo = await service.obterArquivoFoto(
      request.params.id,
      request.params.fotoId,
      request.authUser?.tenant_id
    );
    return response.json({ arquivo });
  }
}
