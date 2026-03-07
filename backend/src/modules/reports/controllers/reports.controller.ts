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
}
