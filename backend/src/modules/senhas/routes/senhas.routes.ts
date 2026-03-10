import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { SenhasController } from "../controllers/senhas.controller.js";

const controller = new SenhasController();

export const senhasRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];

senhasRoutes.get(
  "/aguardando",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarAguardando.bind(controller))
);

senhasRoutes.post(
  "/emitir",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.emitir.bind(controller))
);

senhasRoutes.post(
  "/chamar",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.chamar.bind(controller))
);

senhasRoutes.post(
  "/finalizar",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.finalizar.bind(controller))
);

senhasRoutes.post(
  "/finalizar-fila",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.finalizarFila.bind(controller))
);

senhasRoutes.get(
  "/painel",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.painel.bind(controller))
);

senhasRoutes.get(
  "/atual",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.atual.bind(controller))
);

senhasRoutes.get(
  "/config",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterConfig.bind(controller))
);

senhasRoutes.put(
  "/config",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarConfig.bind(controller))
);
