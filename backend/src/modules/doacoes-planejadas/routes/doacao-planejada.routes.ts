import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { DoacaoPlanejadaController } from "../controllers/doacao-planejada.controller.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";

const controller = new DoacaoPlanejadaController();

export const doacaoPlanejadaRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

doacaoPlanejadaRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
doacaoPlanejadaRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPorId.bind(controller))
);
doacaoPlanejadaRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);
doacaoPlanejadaRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
doacaoPlanejadaRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.remover.bind(controller))
);

