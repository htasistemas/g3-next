import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ReportsController } from "../controllers/reports.controller.js";

const controller = new ReportsController();

export const reportsRoutes = Router();

reportsRoutes.post("/authorization-term", asyncHandler(controller.termoAutorizacao.bind(controller)));
reportsRoutes.post(
  "/unidades-assistenciais/relacao",
  asyncHandler(controller.relacaoUnidadesAssistenciais.bind(controller))
);
reportsRoutes.post(
  "/beneficiarios/relacao",
  asyncHandler(controller.relacaoBeneficiarios.bind(controller))
);
reportsRoutes.post("/beneficiarios/ficha", asyncHandler(controller.fichaBeneficiario.bind(controller)));
reportsRoutes.post(
  "/profissionais/relacao",
  asyncHandler(controller.relacaoProfissionais.bind(controller))
);
reportsRoutes.post(
  "/profissionais/ficha",
  asyncHandler(controller.fichaProfissional.bind(controller))
);
reportsRoutes.post(
  "/voluntarios/relacao",
  asyncHandler(controller.relacaoVoluntarios.bind(controller))
);
reportsRoutes.post(
  "/voluntarios/ficha",
  asyncHandler(controller.fichaVoluntario.bind(controller))
);
reportsRoutes.post(
  "/matriculas/relacao",
  asyncHandler(controller.relacaoMatriculas.bind(controller))
);
reportsRoutes.post(
  "/matriculas/lista-presenca",
  asyncHandler(controller.listaPresencaMatricula.bind(controller))
);
reportsRoutes.post(
  "/matriculas/comprovante",
  asyncHandler(controller.comprovanteMatricula.bind(controller))
);
reportsRoutes.post(
  "/matriculas/pre-matricula-lista-espera",
  asyncHandler(controller.comprovantePreMatriculaEspera.bind(controller))
);
reportsRoutes.post(
  "/registro-doacao/relacao",
  asyncHandler(controller.relacaoRegistroDoacao.bind(controller))
);
reportsRoutes.post(
  "/doacoes-realizadas/relacao",
  asyncHandler(controller.relacaoDoacoesRealizadas.bind(controller))
);
reportsRoutes.post(
  "/doacoes-realizadas/recibo",
  asyncHandler(controller.reciboDoacaoRealizada.bind(controller))
);
reportsRoutes.post(
  "/registro-ponto/espelho",
  asyncHandler(controller.espelhoPonto.bind(controller))
);
