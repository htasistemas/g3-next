import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { formatoRelatorioSchema } from "../reports.schema.js";
import { ReportsService } from "../services/reports.service.js";

const service = new ReportsService();

function responderRelatorio(
  response: Response,
  resultado: { html: string; pdf: Buffer; filename: string },
  formato: "pdf" | "html"
) {
  if (formato === "html") {
    return response.status(200).type("text/html; charset=utf-8").send(resultado.html);
  }

  return response
    .status(200)
    .type("application/pdf")
    .setHeader("Content-Disposition", `inline; filename=\"${resultado.filename}\"`)
    .send(resultado.pdf);
}

export class ReportsController {
  async relacaoUnidadesAssistenciais(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoUnidadesAssistenciais(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoBeneficiarios(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoBeneficiarios(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaBeneficiario(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaBeneficiario(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async termoAutorizacao(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarTermoAutorizacao(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoProfissionais(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoProfissionais(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaProfissional(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaProfissional(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoVoluntarios(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoVoluntarios(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaVoluntario(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaVoluntario(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoMatriculas(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoMatriculas(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async listaPresencaMatricula(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarListaPresencaMatricula(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async comprovanteMatricula(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarComprovanteMatricula(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async comprovantePreMatriculaEspera(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarComprovantePreMatriculaEspera(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoRegistroDoacao(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoRegistroDoacao(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoDoacoesRealizadas(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoDoacoesRealizadas(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async reciboDoacaoRealizada(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarReciboDoacaoRealizada(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }

  async espelhoPonto(request: AuthenticatedRequest, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarEspelhoPonto(request.body, request.authUser);
    return responderRelatorio(response, resultado, formato);
  }
}
