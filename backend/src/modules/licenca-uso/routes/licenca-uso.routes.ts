import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { LicencaUsoController } from "../controllers/licenca-uso.controller.js";

const controller = new LicencaUsoController();

export const licencaUsoRoutes = Router();

licencaUsoRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  asyncHandler(controller.obterConfiguracao.bind(controller))
);

licencaUsoRoutes.put(
  "/",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR"]),
  asyncHandler(controller.atualizarConfiguracao.bind(controller))
);

licencaUsoRoutes.post(
  "/checkout",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR"]),
  asyncHandler(controller.gerarCheckout.bind(controller))
);

licencaUsoRoutes.post(
  "/checkout/confirmar-retorno",
  asyncHandler(controller.confirmarRetorno.bind(controller))
);

licencaUsoRoutes.post(
  "/webhook/infinitepay",
  asyncHandler(controller.webhookInfinitePay.bind(controller))
);
