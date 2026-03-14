import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { ArquivosController, arquivosUploadMiddleware } from "../controllers/arquivos.controller.js";

const controller = new ArquivosController();

export const arquivosRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];

arquivosRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);

arquivosRoutes.post(
  "/upload",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  arquivosUploadMiddleware,
  asyncHandler(controller.upload.bind(controller))
);

arquivosRoutes.get(
  "/conteudo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterConteudoPorCaminho.bind(controller))
);

arquivosRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterPorId.bind(controller))
);

arquivosRoutes.get(
  "/:id/conteudo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterConteudoPorId.bind(controller))
);

arquivosRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.excluir.bind(controller))
);
