import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { AtualizacaoSistemaController } from "../controllers/atualizacao-sistema.controller.js";

const controller = new AtualizacaoSistemaController();
const permissoesVisualizacao = [
  "ADMINISTRADOR",
  "CONFIG_ATUALIZAR_SISTEMA",
  "CONFIG_ALTERAR_MODO_ATUALIZACAO",
  "CONFIG_EXECUTAR_ROLLBACK"
];

export const atualizacaoSistemaRoutes = Router();

atualizacaoSistemaRoutes.get(
  "/current-version",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterVersaoAtual.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/latest-version",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterVersaoPublicada.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/check-update",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.verificarAtualizacao.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/changelog",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterChangelog.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/history",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.listarHistorico.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/logs",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.listarLogs.bind(controller))
);

atualizacaoSistemaRoutes.post(
  "/download-update",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "CONFIG_ATUALIZAR_SISTEMA"]),
  asyncHandler(controller.baixarAtualizacao.bind(controller))
);

atualizacaoSistemaRoutes.post(
  "/apply-update",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "CONFIG_ATUALIZAR_SISTEMA"]),
  asyncHandler(controller.aplicarAtualizacao.bind(controller))
);

atualizacaoSistemaRoutes.post(
  "/rollback",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "CONFIG_EXECUTAR_ROLLBACK"]),
  asyncHandler(controller.rollback.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/status",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterStatus.bind(controller))
);

atualizacaoSistemaRoutes.get(
  "/config",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterConfig.bind(controller))
);

atualizacaoSistemaRoutes.post(
  "/config",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "CONFIG_ALTERAR_MODO_ATUALIZACAO"]),
  asyncHandler(controller.salvarConfig.bind(controller))
);
