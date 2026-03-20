import multer from "multer";
import type { Request, Response } from "express";
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
  async listar(_request: Request, response: Response) {
    const oficios = await service.listar();
    return response.json({ oficios });
  }

  async obter(request: Request, response: Response) {
    const oficio = await service.obter(request.params.id);
    return response.json(oficio);
  }

  async obterProximoNumero(request: Request, response: Response) {
    const numero = await service.obterProximoNumero(request.query.data);
    return response.json({ numero });
  }

  async obterContextoDocumento(_request: Request, response: Response) {
    const contexto = await service.obterContextoDocumento();
    return response.json(contexto);
  }

  async importarConteudo(request: Request, response: Response) {
    const importacao = await service.importarConteudoArquivo(
      (request as AuthenticatedRequest & { file?: Express.Multer.File }).file
    );
    return response.json(importacao);
  }

  async criar(request: Request, response: Response) {
    const oficio = await service.criar(
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json(oficio);
  }

  async atualizar(request: Request, response: Response) {
    const oficio = await service.atualizar(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json(oficio);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }

  async salvarPdfAssinado(request: Request, response: Response) {
    const oficio = await service.salvarPdfAssinado(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.json(oficio);
  }

  async obterPdfAssinado(request: Request, response: Response) {
    const pdf = await service.obterPdfAssinado(request.params.id);
    return response.json(pdf);
  }

  async removerPdfAssinado(request: Request, response: Response) {
    await service.removerPdfAssinado(
      request.params.id,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(204).send();
  }

  async listarImagens(request: Request, response: Response) {
    const imagens = await service.listarImagens(request.params.id);
    return response.json(imagens);
  }

  async adicionarImagem(request: Request, response: Response) {
    const imagem = await service.adicionarImagem(
      request.params.id,
      request.body,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(201).json(imagem);
  }

  async removerImagem(request: Request, response: Response) {
    await service.removerImagem(
      request.params.id,
      request.params.imagemId,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(204).send();
  }

  async documento(request: Request, response: Response) {
    const documento = await service.gerarDocumento(request.params.id);
    return response
      .status(200)
      .type("application/pdf")
      .setHeader("Content-Disposition", `inline; filename="${documento.filename}"`)
      .send(documento.pdf);
  }
}
