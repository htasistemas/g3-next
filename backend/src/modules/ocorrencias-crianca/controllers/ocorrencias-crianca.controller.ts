import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { OcorrenciasCriancaService } from "../services/ocorrencias-crianca.service.js";

const service = new OcorrenciasCriancaService();

export class OcorrenciasCriancaController {
  async listar(request: AuthenticatedRequest, response: Response) {
    const ocorrencias = await service.listar(request.authUser?.tenant_id);
    return response.json(ocorrencias);
  }

  async obter(request: AuthenticatedRequest, response: Response) {
    const ocorrencia = await service.obter(request.params.id, request.authUser?.tenant_id);
    return response.json(ocorrencia);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const ocorrencia = await service.criar(request.body, request.authUser?.tenant_id);
    return response.status(201).json(ocorrencia);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const ocorrencia = await service.atualizar(
      request.params.id,
      request.body,
      request.authUser?.tenant_id
    );
    return response.json(ocorrencia);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser?.tenant_id);
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

  async removerAnexo(request: AuthenticatedRequest, response: Response) {
    await service.removerAnexo(
      request.params.id,
      request.params.anexoId,
      request.authUser?.id,
      request.authUser?.tenant_id
    );
    return response.status(204).send();
  }

  async pdfDenuncia(request: AuthenticatedRequest, response: Response) {
    const pdf = await service.gerarPdfDenuncia(request.params.id, request.authUser?.tenant_id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
    return response.send(pdf.buffer);
  }

  async pdfConselhoTutelar(request: AuthenticatedRequest, response: Response) {
    const pdf = await service.gerarPdfConselhoTutelar(request.params.id, request.authUser?.tenant_id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=\"${pdf.nomeArquivo}\"`);
    return response.send(pdf.buffer);
  }
}
