import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { AuthController } from "../controllers/auth.controller.js";
import { ensureAuthenticated, hydrateAuthenticatedUser } from "../middlewares/auth.middleware.js";

const controller = new AuthController();

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(controller.login.bind(controller)));
authRoutes.post("/google", asyncHandler(controller.loginGoogle.bind(controller)));
authRoutes.post("/esqueci-senha", asyncHandler(controller.esqueciSenha.bind(controller)));
authRoutes.get("/tenant-context", asyncHandler(controller.tenantContext.bind(controller)));
authRoutes.get("/me", hydrateAuthenticatedUser, asyncHandler(controller.me.bind(controller)));
authRoutes.get(
  "/me/preferencias/agendamentos",
  ensureAuthenticated,
  asyncHandler(controller.obterPreferenciaAgendamentos.bind(controller))
);
authRoutes.put(
  "/me/preferencias/agendamentos",
  ensureAuthenticated,
  asyncHandler(controller.salvarPreferenciaAgendamentos.bind(controller))
);
authRoutes.post("/logout", asyncHandler(controller.logout.bind(controller)));
