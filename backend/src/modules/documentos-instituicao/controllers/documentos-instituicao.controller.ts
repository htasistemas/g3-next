import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DocumentosInstituicaoService } from "../services/documentos-instituicao.service.js";

const service = new DocumentosInstituicaoService();

export class DocumentosInstituicaoController {
  async listar(_request: Request, response: Response) {
    const documentos = await service.listar();
    return response.json(documentos);
  }

  async criar(request: Request, response: Response) {
    const documento = await service.criar(request.body);
    return response.status(201).json(documento);
  }

  async atualizar(request: Request, response: Response) {
    const documento = await service.atualizar(request.params.id, request.body);
    return response.json(documento);
  }

  async excluir(request: Request, response: Response) {
    await service.excluir(request.params.id);
    return response.status(204).send();
  }

  async listarAnexos(request: Request, response: Response) {
    const anexos = await service.listarAnexos(request.params.id);
    return response.json(anexos);
  }

  async adicionarAnexo(request: Request, response: Response) {
    const anexo = await service.adicionarAnexo(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json(anexo);
  }

  async substituirAnexo(request: Request, response: Response) {
    const anexo = await service.substituirAnexo(
      request.params.id,
      request.params.anexoId,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json(anexo);
  }

  async excluirAnexo(request: Request, response: Response) {
    await service.excluirAnexo(
      request.params.id,
      request.params.anexoId,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(204).send();
  }

  async obterArquivoAnexo(request: Request, response: Response) {
    const arquivo = await service.obterArquivoAnexo(request.params.id, request.params.anexoId);
    return response.json({ arquivo });
  }

  async listarHistorico(request: Request, response: Response) {
    const historico = await service.listarHistorico(request.params.id);
    return response.json(historico);
  }

  async adicionarHistorico(request: Request, response: Response) {
    const historico = await service.adicionarHistorico(request.params.id, request.body);
    return response.status(201).json(historico);
  }
}
