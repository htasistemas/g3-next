import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { PerfisAcessoController } from "../controllers/perfis-acesso.controller.js";

const controller = new PerfisAcessoController();
export const perfisAcessoRoutes = Router();
const administrar = ["ADMINISTRADOR", "CONFIGURACOES_PERFIS_ACESSO_ADMINISTRAR"];
perfisAcessoRoutes.use(ensureAuthenticated, ensurePermissions(administrar));
perfisAcessoRoutes.get("/catalogo", asyncHandler(controller.catalogo));
perfisAcessoRoutes.get("/", asyncHandler(controller.listar));
perfisAcessoRoutes.get("/:id", asyncHandler(controller.buscar));
perfisAcessoRoutes.post("/", asyncHandler(controller.criar));
perfisAcessoRoutes.put("/:id", asyncHandler(controller.atualizar));
perfisAcessoRoutes.post("/:id/duplicar", asyncHandler(controller.duplicar));
perfisAcessoRoutes.patch("/:id/status", asyncHandler(controller.alternar));
