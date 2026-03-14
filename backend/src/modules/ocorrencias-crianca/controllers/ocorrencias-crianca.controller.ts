import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { OcorrenciasCriancaService } from "../services/ocorrencias-crianca.service.js";

const service = new OcorrenciasCriancaService();

export class OcorrenciasCriancaController {
  async listar(_request: Request, response: Response) {
    const ocorrencias = await service.listar();
    return response.json(ocorrencias);
  }

  async obter(request: Request, response: Response) {
    const ocorrencia = await service.obter(request.params.id);
    return response.json(ocorrencia);
  }

  async criar(request: Request, response: Response) {
    const ocorrencia = await service.criar(request.body);
    return response.status(201).json(ocorrencia);
  }

  async atualizar(request: Request, response: Response) {
    const ocorrencia = await service.atualizar(request.params.id, request.body);
    return response.json(ocorrencia);
  }

  async excluir(request: Request, response: Response) {
    await service.remover(request.params.id);
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

  async removerAnexo(request: Request, response: Response) {
    await service.removerAnexo(
      request.params.id,
      request.params.anexoId,
      (request as AuthenticatedRequest).authUser?.id
    );
    return response.status(204).send();
  }

  async pdfDenuncia(request: Request, response: Response) {
    const pdf = await service.gerarPdfDenuncia(request.params.id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
    return response.send(pdf.buffer);
  }

  async pdfConselhoTutelar(request: Request, response: Response) {
    const pdf = await service.gerarPdfConselhoTutelar(request.params.id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
    return response.send(pdf.buffer);
  }
}
