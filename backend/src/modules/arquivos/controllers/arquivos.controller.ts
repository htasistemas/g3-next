import multer from "multer";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import {
  mapArquivoMetadataToResponse,
  mapArquivoUploadToResponse
} from "../arquivos.mapper.js";
import { ArquivosService } from "../services/arquivos.service.js";

const service = new ArquivosService();

export const arquivosUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
}).single("arquivo");

export class ArquivosController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const arquivos = await service.listar(
      request.query as Record<string, unknown>,
      request.authUser?.tenant_id
    );
    return response.json({ arquivos: arquivos.map(mapArquivoMetadataToResponse) });
  }

  async upload(request: AuthenticatedRequest, response: Response) {
    const arquivo = await service.upload(request as AuthenticatedRequest & { file?: Express.Multer.File });
    return response.status(201).json({ arquivo: mapArquivoUploadToResponse(arquivo) });
  }

  async obterPorId(request: AuthenticatedRequest, response: Response) {
    const arquivo = await service.obterPorId(request.params.id, request.authUser?.tenant_id);
    return response.json({ arquivo: mapArquivoMetadataToResponse(arquivo) });
  }

  async obterConteudoPorId(request: AuthenticatedRequest, response: Response) {
    const conteudo = await service.obterConteudoPorId(
      request.params.id,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return this.enviarConteudo(response, conteudo, request.query.download);
  }

  async obterConteudoPorCaminho(request: AuthenticatedRequest, response: Response) {
    const conteudo = await service.obterConteudoPorCaminho(
      String(request.query.path ?? ""),
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return this.enviarConteudo(response, conteudo, request.query.download);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.excluir(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
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
