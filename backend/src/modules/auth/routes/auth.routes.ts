import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { rateLimit } from "../../../shared/http/rate-limit.js";
import { AuthController } from "../controllers/auth.controller.js";
import { ensureAuthenticated, hydrateAuthenticatedUser } from "../middlewares/auth.middleware.js";

const controller = new AuthController();

export const authRoutes = Router();

const loginRateLimit = rateLimit({
  keyPrefix: "auth-login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (request) => String(request.body?.email ?? request.body?.nomeUsuario ?? "")
});
const recuperacaoSenhaRateLimit = rateLimit({
  keyPrefix: "auth-esqueci-senha",
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (request) => String(request.body?.email ?? "")
});

authRoutes.post("/login", loginRateLimit, asyncHandler(controller.login.bind(controller)));
authRoutes.post("/google", loginRateLimit, asyncHandler(controller.loginGoogle.bind(controller)));
authRoutes.post("/esqueci-senha", recuperacaoSenhaRateLimit, asyncHandler(controller.esqueciSenha.bind(controller)));
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
