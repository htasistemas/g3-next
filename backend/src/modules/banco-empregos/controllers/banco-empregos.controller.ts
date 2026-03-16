import multer from "multer";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { BancoEmpregosService } from "../services/banco-empregos.service.js";

const service = new BancoEmpregosService();

export const bancoEmpregosUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
}).single("arquivo");

export class BancoEmpregosController {
  async dashboard(request: Request, response: Response) {
    const resultado = await service.listarDashboard(request.query);
    return response.json(resultado);
  }

  async exportar(request: Request, response: Response) {
    const tipo =
      request.params.tipo === "candidatos" || request.params.tipo === "triagem"
        ? request.params.tipo
        : "vagas";
    const formato = request.query.formato === "pdf" ? "pdf" : "csv";
    const resultado = await service.exportar(request.query, tipo, formato);
    return response
      .status(200)
      .type(resultado.contentType)
      .setHeader("Content-Disposition", `attachment; filename="${resultado.filename}"`)
      .send(resultado.buffer);
  }

  async gerarCarta(request: AuthenticatedRequest, response: Response) {
    const tipo =
      request.params.tipo === "encaminhamento" ||
      request.params.tipo === "recomendacao" ||
      request.params.tipo === "comprovante" ||
      request.params.tipo === "ficha"
        ? request.params.tipo
        : "encaminhamento";
    const resultado = await service.gerarCarta(request.params.processoId, tipo, request.authUser);
    return response
      .status(200)
      .type(resultado.contentType)
      .setHeader("Content-Disposition", `inline; filename="${resultado.filename}"`)
      .send(resultado.buffer);
  }

  async listar(request: Request, response: Response) {
    const vagas = await service.listar(request.query);
    return response.json(vagas);
  }

  async obter(request: Request, response: Response) {
    const vaga = await service.obter(request.params.id);
    return response.json(vaga);
  }

  async criar(request: AuthenticatedRequest, response: Response) {
    const vaga = await service.criar(request.body, request.authUser);
    return response.status(201).json(vaga);
  }

  async atualizar(request: AuthenticatedRequest, response: Response) {
    const vaga = await service.atualizar(request.params.id, request.body, request.authUser);
    return response.json(vaga);
  }

  async excluir(request: AuthenticatedRequest, response: Response) {
    await service.remover(request.params.id, request.authUser);
    return response.status(204).send();
  }

  async listarCandidatos(request: Request, response: Response) {
    const candidatos = await service.listarCandidatos(request.query);
    return response.json(candidatos);
  }

  async buscarCandidato(request: Request, response: Response) {
    const candidato = await service.buscarCandidato(request.params.candidatoId);
    return response.json(candidato);
  }

  async criarCandidato(request: AuthenticatedRequest, response: Response) {
    const candidato = await service.criarCandidato(request.body, request.authUser);
    return response.status(201).json(candidato);
  }

  async atualizarCandidato(request: AuthenticatedRequest, response: Response) {
    const candidato = await service.atualizarCandidato(
      request.params.candidatoId,
      request.body,
      request.authUser
    );
    return response.json(candidato);
  }

  async inativarCandidato(request: AuthenticatedRequest, response: Response) {
    await service.inativarCandidato(request.params.candidatoId, request.authUser);
    return response.status(204).send();
  }

  async listarDocumentos(request: Request, response: Response) {
    const documentos = await service.listarDocumentos(request.params.candidatoId);
    return response.json(documentos);
  }

  async adicionarDocumento(request: AuthenticatedRequest, response: Response) {
    const documento = await service.adicionarDocumento(
      request.params.candidatoId,
      request.body,
      request.file,
      request.authUser
    );
    return response.status(201).json(documento);
  }

  async removerDocumento(request: AuthenticatedRequest, response: Response) {
    await service.removerDocumento(request.params.documentoId, request.authUser);
    return response.status(204).send();
  }

  async listarProcessos(request: Request, response: Response) {
    const processos = await service.listarProcessos(request.query);
    return response.json(processos);
  }

  async buscarProcesso(request: Request, response: Response) {
    const processo = await service.buscarProcesso(request.params.processoId);
    return response.json(processo);
  }

  async vincularCandidato(request: AuthenticatedRequest, response: Response) {
    const processo = await service.vincularCandidato(request.body, request.authUser);
    return response.status(201).json(processo);
  }

  async atualizarProcesso(request: AuthenticatedRequest, response: Response) {
    const processo = await service.atualizarProcesso(request.params.processoId, request.body, request.authUser);
    return response.json(processo);
  }

  async salvarAvaliacao(request: AuthenticatedRequest, response: Response) {
    const avaliacao = await service.salvarAvaliacao(request.params.processoId, request.body, request.authUser);
    return response.json(avaliacao);
  }

  async listarHistorico(request: Request, response: Response) {
    const historico = await service.listarHistorico(request.query);
    return response.json(historico);
  }
}
