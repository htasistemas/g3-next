import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../auth/middlewares/auth.middleware.js";
import { ParceriasPublicasController } from "./parcerias-publicas.controller.js";

const controller = new ParceriasPublicasController();
export const parceriasPublicasRoutes = Router();
parceriasPublicasRoutes.use(ensureAuthenticated);
parceriasPublicasRoutes.get("/", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_PARCERIAS_VISUALIZAR"]), asyncHandler(controller.listar.bind(controller)));
parceriasPublicasRoutes.post("/", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_PARCERIAS_EDITAR"]), asyncHandler(controller.criarParceria.bind(controller)));
parceriasPublicasRoutes.post("/indicadores", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_PARCERIAS_EDITAR"]), asyncHandler(controller.criarIndicador.bind(controller)));
parceriasPublicasRoutes.post("/evidencias", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_PARCERIAS_EDITAR"]), asyncHandler(controller.criarEvidencia.bind(controller)));
