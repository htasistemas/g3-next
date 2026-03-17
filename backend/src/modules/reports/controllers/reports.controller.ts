import type { Request, Response } from "express";
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
  async relacaoUnidadesAssistenciais(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoUnidadesAssistenciais(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoBeneficiarios(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoBeneficiarios(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaBeneficiario(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaBeneficiario(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async termoAutorizacao(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarTermoAutorizacao(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoProfissionais(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoProfissionais(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaProfissional(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaProfissional(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoVoluntarios(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoVoluntarios(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async fichaVoluntario(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarFichaVoluntario(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoMatriculas(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoMatriculas(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async comprovanteMatricula(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarComprovanteMatricula(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async comprovantePreMatriculaEspera(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarComprovantePreMatriculaEspera(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoRegistroDoacao(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoRegistroDoacao(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async relacaoDoacoesRealizadas(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarRelacaoDoacoesRealizadas(request.body);
    return responderRelatorio(response, resultado, formato);
  }

  async reciboDoacaoRealizada(request: Request, response: Response) {
    const formato = formatoRelatorioSchema.parse(request.query.formato);
    const resultado = await service.gerarReciboDoacaoRealizada(request.body);
    return responderRelatorio(response, resultado, formato);
  }
}
