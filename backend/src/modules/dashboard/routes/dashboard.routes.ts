import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { DashboardController } from "../controllers/dashboard.controller.js";

const controller = new DashboardController();

export const dashboardRoutes = Router();

dashboardRoutes.get(
  "/assistencia",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  asyncHandler(controller.obterAssistencia.bind(controller))
);
