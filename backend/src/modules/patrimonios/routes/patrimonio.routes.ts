import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { PatrimonioController } from "../controllers/patrimonio.controller.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";

const controller = new PatrimonioController();

export const patrimonioRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];

patrimonioRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
patrimonioRoutes.get(
  "/categorias",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarCategorias.bind(controller))
);
patrimonioRoutes.post(
  "/categorias",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarCategoria.bind(controller))
);
patrimonioRoutes.put(
  "/categorias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarCategoria.bind(controller))
);
patrimonioRoutes.delete(
  "/categorias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerCategoria.bind(controller))
);
patrimonioRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);
patrimonioRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
patrimonioRoutes.post(
  "/:id/movimentos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.registrarMovimento.bind(controller))
);
