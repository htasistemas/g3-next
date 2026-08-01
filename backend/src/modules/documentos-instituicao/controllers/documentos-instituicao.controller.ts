import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DocumentosInstituicaoService } from "../services/documentos-instituicao.service.js";

const service = new DocumentosInstituicaoService();

export class DocumentosInstituicaoController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const documentos = await service.listar(request.authUser?.tenant_id);
    return response.json(documentos);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const documento = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(documento);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const documento = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(documento);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.excluir(request.params.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async listarAnexos(request: AuthenticatedRequest, response: Response) {
    const anexos = await service.listarAnexos(request.params.id, request.authUser?.tenant_id);
    return response.json(anexos);
  }

  async adicionarAnexo(request: AuthenticatedRequest, response: Response) {
    const anexo = await service.adicionarAnexo(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json(anexo);
  }

  async substituirAnexo(request: AuthenticatedRequest, response: Response) {
    const anexo = await service.substituirAnexo(
      request.params.id,
      request.params.anexoId,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json(anexo);
  }

  async excluirAnexo(request: AuthenticatedRequest, response: Response) {
    await service.excluirAnexo(
      request.params.id,
      request.params.anexoId,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(204).send();
  }

  async obterArquivoAnexo(request: AuthenticatedRequest, response: Response) {
    const conteudo = await service.obterArquivoAnexo(
      request.params.id,
      request.params.anexoId,
      request.authUser?.tenant_id
    );

    response.setHeader("Content-Type", conteudo.mimeType);
    response.setHeader("Cache-Control", "private, max-age=3600");
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(conteudo.nomeArquivo)}"`
    );

    return conteudo.stream.pipe(response);
  }

  async listarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.listarHistorico(request.params.id, request.authUser?.tenant_id);
    return response.json(historico);
  }

  async adicionarHistorico(request: AuthenticatedRequest, response: Response) {
    const historico = await service.adicionarHistorico(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.status(201).json(historico);
  }
}
