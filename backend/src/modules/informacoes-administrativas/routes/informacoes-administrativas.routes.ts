import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { InformacoesAdministrativasController } from "../controllers/informacoes-administrativas.controller.js";

const controller = new InformacoesAdministrativasController();

export const informacoesAdministrativasRoutes = Router();

const permissoesAdministrativas = ["ADMINISTRADOR", "MASTER_ADMIN"];

informacoesAdministrativasRoutes.post(
  "/consultar",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.listar.bind(controller))
);

informacoesAdministrativasRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.criar.bind(controller))
);

informacoesAdministrativasRoutes.post(
  "/categorias/consultar",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.listarCategorias.bind(controller))
);

informacoesAdministrativasRoutes.post(
  "/categorias",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.criarCategoria.bind(controller))
);

informacoesAdministrativasRoutes.put(
  "/categorias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.atualizarCategoria.bind(controller))
);

informacoesAdministrativasRoutes.delete(
  "/categorias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.removerCategoria.bind(controller))
);

informacoesAdministrativasRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.atualizar.bind(controller))
);

informacoesAdministrativasRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministrativas),
  asyncHandler(controller.remover.bind(controller))
);
