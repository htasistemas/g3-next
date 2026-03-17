import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { ParametrosSistemaController } from "../controllers/parametros-sistema.controller.js";

const controller = new ParametrosSistemaController();

export const parametrosSistemaRoutes = Router();

parametrosSistemaRoutes.get(
  "/personalizacao",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  asyncHandler(controller.obterPersonalizacao.bind(controller))
);

parametrosSistemaRoutes.put(
  "/personalizacao",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR"]),
  asyncHandler(controller.atualizarPersonalizacao.bind(controller))
);

parametrosSistemaRoutes.get(
  "/carencia/doacoes-realizadas",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"]),
  asyncHandler(controller.obterCarenciaDoacaoRealizada.bind(controller))
);

parametrosSistemaRoutes.put(
  "/carencia/doacoes-realizadas",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR"]),
  asyncHandler(controller.atualizarCarenciaDoacaoRealizada.bind(controller))
);
