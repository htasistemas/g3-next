import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { AlmoxarifadoController } from "../controllers/almoxarifado.controller.js";

const controller = new AlmoxarifadoController();

export const almoxarifadoRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

almoxarifadoRoutes.get(
  "/items",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarItens.bind(controller))
);
almoxarifadoRoutes.get(
  "/items/next-code",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterProximoCodigo.bind(controller))
);
almoxarifadoRoutes.post(
  "/items",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarItem.bind(controller))
);
almoxarifadoRoutes.put(
  "/items/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarItem.bind(controller))
);
almoxarifadoRoutes.delete(
  "/items/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.removerItem.bind(controller))
);

almoxarifadoRoutes.get(
  "/movements",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarMovimentacoes.bind(controller))
);
almoxarifadoRoutes.post(
  "/movements",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.registrarMovimentacao.bind(controller))
);

almoxarifadoRoutes.get(
  "/produtos/:id/kit-composicao",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarComposicaoKit.bind(controller))
);
almoxarifadoRoutes.put(
  "/produtos/:id/kit-composicao",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarComposicaoKit.bind(controller))
);
almoxarifadoRoutes.get(
  "/movements/:id/kit-vinculos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarVinculosKit.bind(controller))
);
