import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { RhContratacaoService } from "../services/rh-contratacao.service.js";

const service = new RhContratacaoService();

export class RhContratacaoController {
  private obterUsuarioId(request: Request) {
    const authUserId = (request as AuthenticatedRequest).authUser?.id;
    if (authUserId) return authUserId;
    return String(request.query.usuarioId ?? "");
  }

  async listarCandidatos(request: Request, response: Response) {
    const lista = await service.listarCandidatos(String(request.query.termo ?? ""));
    return response.json(lista);
  }

  async buscarCandidato(request: Request, response: Response) {
    const candidato = await service.buscarCandidato(request.params.id);
    return response.json(candidato);
  }

  async criarCandidato(request: Request, response: Response) {
    const candidato = await service.criarCandidato(request.body, this.obterUsuarioId(request));
    return response.status(201).json(candidato);
  }

  async atualizarCandidato(request: Request, response: Response) {
    const candidato = await service.atualizarCandidato(
      request.params.id,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(candidato);
  }

  async inativarCandidato(request: Request, response: Response) {
    await service.inativarCandidato(request.params.id, this.obterUsuarioId(request));
    return response.status(204).send();
  }

  async buscarProcessoPorCandidato(request: Request, response: Response) {
    const processo = await service.buscarProcessoPorCandidato(request.params.candidatoId);
    return response.json(processo);
  }

  async atualizarStatus(request: Request, response: Response) {
    const processo = await service.atualizarStatus(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(processo);
  }

  async listarEntrevistas(request: Request, response: Response) {
    const lista = await service.listarEntrevistas(request.params.processoId);
    return response.json(lista);
  }

  async salvarEntrevista(request: Request, response: Response) {
    const entrevista = await service.salvarEntrevista(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.status(201).json(entrevista);
  }

  async buscarFicha(request: Request, response: Response) {
    const ficha = await service.buscarFicha(request.params.processoId);
    return response.json(ficha);
  }

  async salvarFicha(request: Request, response: Response) {
    const ficha = await service.salvarFicha(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(ficha);
  }

  async listarDocumentos(request: Request, response: Response) {
    const lista = await service.listarDocumentos(request.params.processoId);
    return response.json(lista);
  }

  async atualizarDocumento(request: Request, response: Response) {
    const documento = await service.atualizarDocumento(
      request.params.documentoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(documento);
  }

  async listarArquivos(request: Request, response: Response) {
    const lista = await service.listarArquivos(request.params.processoId);
    return response.json(lista);
  }

  async adicionarArquivo(request: Request, response: Response) {
    const arquivo = await service.adicionarArquivo(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.status(201).json(arquivo);
  }

  async listarTermos(request: Request, response: Response) {
    const lista = await service.listarTermos(request.params.processoId);
    return response.json(lista);
  }

  async salvarTermo(request: Request, response: Response) {
    const termo = await service.salvarTermo(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.status(201).json(termo);
  }

  async buscarPpd(request: Request, response: Response) {
    const ppd = await service.buscarPpd(request.params.processoId);
    return response.json(ppd);
  }

  async salvarPpd(request: Request, response: Response) {
    const ppd = await service.salvarPpd(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(ppd);
  }

  async buscarCartaBanco(request: Request, response: Response) {
    const carta = await service.buscarCartaBanco(request.params.processoId);
    return response.json(carta);
  }

  async salvarCartaBanco(request: Request, response: Response) {
    const carta = await service.salvarCartaBanco(
      request.params.processoId,
      request.body,
      this.obterUsuarioId(request)
    );
    return response.json(carta);
  }

  async listarAuditoria(request: Request, response: Response) {
    const lista = await service.listarAuditoria(request.params.processoId);
    return response.json(lista);
  }
}
