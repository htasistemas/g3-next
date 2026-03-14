import multer from "multer";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ArquivosService } from "../services/arquivos.service.js";

const service = new ArquivosService();

export const arquivosUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
}).single("arquivo");

export class ArquivosController {
  async listar(request: Request, response: Response) {
    const arquivos = await service.listar(request.query as Record<string, unknown>);
    return response.json({ arquivos });
  }

  async upload(request: Request, response: Response) {
    const arquivo = await service.upload(request as AuthenticatedRequest & { file?: Express.Multer.File });
    return response.status(201).json({ arquivo });
  }

  async obterPorId(request: Request, response: Response) {
    const arquivo = await service.obterPorId(request.params.id);
    return response.json({ arquivo });
  }

  async obterConteudoPorId(request: Request, response: Response) {
    const conteudo = await service.obterConteudoPorId(
      request.params.id,
      (request as AuthenticatedRequest).authUser?.id
    );
    return this.enviarConteudo(response, conteudo, request.query.download);
  }

  async obterConteudoPorCaminho(request: Request, response: Response) {
    const conteudo = await service.obterConteudoPorCaminho(
      String(request.query.path ?? ""),
      (request as AuthenticatedRequest).authUser?.id
    );
    return this.enviarConteudo(response, conteudo, request.query.download);
  }

  async excluir(request: Request, response: Response) {
    await service.excluir(request.params.id, (request as AuthenticatedRequest).authUser?.id);
    return response.status(204).send();
  }

  private enviarConteudo(
    response: Response,
    conteudo: Awaited<ReturnType<ArquivosService["obterConteudoPorId"]>>,
    download?: unknown
  ) {
    const forcarDownload =
      typeof download === "string" && ["1", "true", "sim", "yes"].includes(download.toLowerCase());

    response.setHeader("Content-Type", conteudo.mimeType);
    response.setHeader(
      "Content-Disposition",
      `${forcarDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(conteudo.nomeArquivo)}"`
    );

    return conteudo.stream.pipe(response);
  }
}
