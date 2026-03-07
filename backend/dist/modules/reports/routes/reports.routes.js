import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ReportsController } from "../controllers/reports.controller.js";
const controller = new ReportsController();
export const reportsRoutes = Router();
reportsRoutes.post("/authorization-term", asyncHandler(controller.termoAutorizacao.bind(controller)));
reportsRoutes.post("/beneficiarios/relacao", asyncHandler(controller.relacaoBeneficiarios.bind(controller)));
reportsRoutes.post("/beneficiarios/ficha", asyncHandler(controller.fichaBeneficiario.bind(controller)));
