import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { RegistroDoacaoController } from "../controllers/registro-doacao.controller.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";

const controller = new RegistroDoacaoController();

export const registroDoacaoRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

registroDoacaoRoutes.get(
  "/doadores",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarDoadores.bind(controller))
);
registroDoacaoRoutes.post(
  "/doadores",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarDoador.bind(controller))
);
registroDoacaoRoutes.delete(
  "/doadores/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.removerDoador.bind(controller))
);

registroDoacaoRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
registroDoacaoRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPorId.bind(controller))
);
registroDoacaoRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);
registroDoacaoRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
registroDoacaoRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.remover.bind(controller))
);
