import type { Request, Response } from "express";
import { InstituicoesService } from "../services/instituicoes.service.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";

const service = new InstituicoesService();

export class InstituicoesController {
  async listar(_request: Request, response: Response) {
    const instituicoes = await service.listar();
    return response.json({ instituicoes });
  }

  async listarUsuarios(request: Request, response: Response) {
    const usuarios = await service.listarUsuarios(request.params.id);
    return response.json(usuarios);
  }

  async criar(request: Request, response: Response) {
    const instituicao = await service.criar(request.body);
    return response.status(201).json({ instituicao });
  }

  async atualizar(request: Request, response: Response) {
    const instituicao = await service.atualizar(request.params.id, request.body);
    return response.json({ instituicao });
  }

  async resetarAdmin(request: Request, response: Response) {
    const resultado = await service.resetarAdmin(request.params.id, request.body);
    return response.json(resultado);
  }

  async desbloquearAcesso(request: Request, response: Response) {
    const resultado = await service.desbloquearAcesso(request.params.id);
    return response.json(resultado);
  }

  async criarUsuario(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.criarUsuario(
      request.params.id,
      request.body,
      request.authUser?.nomeUsuario,
      request.authUser?.id
    );
    return response.status(201).json(resultado);
  }

  async atualizarUsuario(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.atualizarUsuario(
      request.params.id,
      request.params.usuarioId,
      request.body,
      request.authUser?.nomeUsuario,
      request.authUser?.id
    );
    return response.json(resultado);
  }

  async resetarSenhaUsuario(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.resetarSenhaUsuario(
      request.params.id,
      request.params.usuarioId,
      request.body,
      request.authUser?.nomeUsuario,
      request.authUser?.id
    );
    return response.json(resultado);
  }
}
