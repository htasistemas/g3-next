import multer from "multer";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { OficiosService } from "../services/oficios.service.js";

const service = new OficiosService();

export const oficiosImportUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
}).single("arquivo");

export class OficiosController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const oficios = await service.listar(request.authUser?.tenant_id);
    return response.json({ oficios });
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const oficio = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json(oficio);
  }

  async obterProximoNumero(request: AuthenticatedRequest, response: Response) {
    const numero = await service.obterProximoNumero(request.query.data, request.authUser?.tenant_id);
    return response.json({ numero });
  }

  async obterContextoDocumento(request: AuthenticatedRequest, response: Response) {
    const contexto = await service.obterContextoDocumento(request.authUser?.tenant_id);
    return response.json(contexto);
  }

  async importarConteudo(request: AuthenticatedRequest, response: Response) {
    const importacao = await service.importarConteudoArquivo(
      (request as AuthenticatedRequest & { file?: Express.Multer.File }).file
    );
    return response.json(importacao);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const oficio = await service.criar(
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json(oficio);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const oficio = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json(oficio);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
    return response.status(204).send();
  }

  async salvarPdfAssinado(request: AuthenticatedRequest, response: Response) {
    const oficio = await service.salvarPdfAssinado(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.json(oficio);
  }

  async obterPdfAssinado(request: AuthenticatedRequest, response: Response) {
    const pdf = await service.obterPdfAssinado(request.params.id, request.authUser?.tenant_id);
    return response.json(pdf);
  }

  async removerPdfAssinado(request: AuthenticatedRequest, response: Response) {
    await service.removerPdfAssinado(
      request.params.id,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(204).send();
  }

  async listarImagens(request: AuthenticatedRequest, response: Response) {
    const imagens = await service.listarImagens(request.params.id, request.authUser?.tenant_id);
    return response.json(imagens);
  }

  async adicionarImagem(request: AuthenticatedRequest, response: Response) {
    const imagem = await service.adicionarImagem(
      request.params.id,
      request.body,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(201).json(imagem);
  }

  async removerImagem(request: AuthenticatedRequest, response: Response) {
    await service.removerImagem(
      request.params.id,
      request.params.imagemId,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(204).send();
  }

  async documento(request: AuthenticatedRequest, response: Response) {
    const documento = await service.gerarDocumento(request.params.id, request.authUser?.tenant_id);
    return response
      .status(200)
      .type("application/pdf")
      .setHeader("Content-Disposition", `inline; filename="${documento.filename}"`)
      .send(documento.pdf);
  }
}
