import multer from "multer";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { ChamadoTecnicoService } from "../services/chamado-tecnico.service.js";

const service = new ChamadoTecnicoService();

export const chamadoTecnicoUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 }
}).array("files", 10);

export class ChamadoTecnicoController {
  async exportar(request: AuthenticatedRequest, response: Response) {
    const formato = request.query.formato === "pdf" ? "pdf" : "excel";
    const resultado = await service.exportar(request.query, formato, request.authUser);
    return response
      .status(200)
      .type(resultado.contentType)
      .setHeader("Content-Disposition", `attachment; filename="${resultado.filename}"`)
      .send(resultado.buffer);
  }

  async listar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listar(request.query, request.authUser);
    return response.json(resultado);
  }

  async buscarPorId(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.buscarPorId(request.params.id, request.authUser);
    return response.json(resultado);
  }

  async listarCatalogo(_request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarCatalogo();
    return response.json(resultado);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.criar(request.body, request.authUser);
    return response.status(201).json(resultado);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.atualizar(request.params.id, request.body, request.authUser);
    return response.json(resultado);
  }

  async remover(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser);
    return response.status(204).send();
  }

  async alterarSituacao(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.alterarSituacao(request.params.id, request.body, request.authUser);
    return response.json(resultado);
  }

  async adicionarComentario(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.adicionarComentario(request.params.id, request.body, request.authUser);
    return response.status(201).json(resultado);
  }

  async adicionarVinculo(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.adicionarVinculo(request.params.id, request.body, request.authUser);
    return response.status(201).json(resultado);
  }

  async removerVinculo(request: AuthenticatedRequest, response: Response) {
    await service.removerVinculo(request.params.id, request.params.vinculoId, request.authUser);
    return response.status(204).send();
  }

  async listarFiltrosSalvos(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.listarFiltrosSalvos(request.authUser);
    return response.json({ filtros: resultado });
  }

  async salvarFiltro(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarFiltro(request.body, request.authUser);
    return response.status(201).json(resultado);
  }

  async atualizarFiltro(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarFiltro(request.body, request.authUser, request.params.filtroId);
    return response.json(resultado);
  }

  async removerFiltro(request: AuthenticatedRequest, response: Response) {
    await service.removerFiltro(request.params.filtroId, request.authUser);
    return response.status(204).send();
  }

  async adicionarAnexos(request: AuthenticatedRequest, response: Response) {
    const files = Array.isArray(request.files) ? request.files : [];
    const resultado = await service.adicionarAnexos(request.params.id, files, request.authUser);
    return response.status(201).json(resultado);
  }

  async removerAnexo(request: AuthenticatedRequest, response: Response) {
    await service.removerAnexo(request.params.id, request.params.arquivoId, request.authUser);
    return response.status(204).send();
  }

  async salvarParametro(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarParametro(request.body);
    return response.status(201).json(resultado);
  }

  async atualizarParametro(request: AuthenticatedRequest, response: Response) {
    const resultado = await service.salvarParametro(request.body, request.params.parametroId);
    return response.json(resultado);
  }
}
