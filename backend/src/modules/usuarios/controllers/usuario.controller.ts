import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { UsuarioService } from "../services/usuario.service.js";

const service = new UsuarioService();

export class UsuarioController {
  private buildAtor(request: AuthenticatedRequest) {
    return {
      id: request.authUser?.id,
      nomeUsuario: request.authUser?.nomeUsuario,
      tenant_id: request.authUser?.tenant_id,
      instituicao_id: request.authUser?.instituicao_id
    };
  }

  async listar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listar(request.query, this.buildAtor(request));
    return response.json(resultado);
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.buscarPorId(request.params.id, this.buildAtor(request));
    return response.json(resultado);
  }

  async listarPermissoes(_request: AuthenticatedRequest, response: Response) {
    const permissoes = await service.listarPermissoes();
    return response.json({ permissoes });
  }

  async listarAcessos(request: AuthenticatedRequest, response: Response) {
    return response.json({ acessos: await service.listarAcessos(request.params.id, this.buildAtor(request)) });
  }

  async substituirAcessos(request: AuthenticatedRequest, response: Response) {
    return response.json({ acessos: await service.substituirAcessos(request.params.id, request.body, this.buildAtor(request)) });
  }

  async listarCatalogoAcessos(request: AuthenticatedRequest, response: Response) {
    return response.json(await service.listarCatalogoAcessos(this.buildAtor(request)));
  }

  async buscarFace(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.buscarFace(request.params.id, this.buildAtor(request));
    return response.json(resultado);
  }

  async salvarFace(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarFace(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }

  async removerFace(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.removerFace(request.params.id, this.buildAtor(request));
    return response.json(resultado);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.criar(request.body, this.buildAtor(request));
    return response.status(201).json(resultado);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.atualizar(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }

  async atualizarStatus(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.atualizarStatus(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }

  async resetarSenha(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.resetarSenha(request.params.id, request.body, this.buildAtor(request));
    return response.json(resultado);
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.remover(request.params.id, this.buildAtor(request));
    return response.json(resultado);
  }
}
