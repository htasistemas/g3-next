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
authRoutes.post("/selecionar-ambiente", loginRateLimit, asyncHandler(controller.selecionarAmbiente.bind(controller)));
authRoutes.get("/ambientes", ensureAuthenticated, asyncHandler(controller.listarAmbientes.bind(controller)));
authRoutes.post("/trocar-ambiente", ensureAuthenticated, asyncHandler(controller.trocarAmbiente.bind(controller)));
authRoutes.get("/contexto-opcoes", ensureAuthenticated, asyncHandler(controller.listarOpcoesContexto.bind(controller)));
authRoutes.post("/contexto", ensureAuthenticated, asyncHandler(controller.trocarContexto.bind(controller)));
authRoutes.post("/google", loginRateLimit, asyncHandler(controller.loginGoogle.bind(controller)));
authRoutes.post("/mfa/verificar", loginRateLimit, asyncHandler(controller.verificarMfa.bind(controller)));
authRoutes.post("/face/verificar", loginRateLimit, asyncHandler(controller.verificarFace.bind(controller)));
authRoutes.post("/passkeys/login/options", loginRateLimit, asyncHandler(controller.iniciarLoginPasskey.bind(controller)));
authRoutes.post("/passkeys/login/verify", loginRateLimit, asyncHandler(controller.concluirLoginPasskey.bind(controller)));
authRoutes.post(
  "/passkeys/register/options",
  ensureAuthenticated,
  asyncHandler(controller.iniciarCadastroPasskey.bind(controller))
);
authRoutes.post(
  "/passkeys/register/verify",
  ensureAuthenticated,
  asyncHandler(controller.concluirCadastroPasskey.bind(controller))
);
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
