import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { DatasComemorativasController } from "../controllers/datas-comemorativas.controller.js";

const controller = new DatasComemorativasController();

export const datasComemorativasRoutes = Router();

const permissaoVisualizar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_VISUALIZAR"];
const permissaoCadastrar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_CADASTRAR"];
const permissaoEditar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_EDITAR"];
const permissaoExcluir = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_EXCLUIR"];
const permissaoAtivar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_ATIVAR"];
const permissaoImportar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_IMPORTAR"];
const permissaoSincronizar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_SINCRONIZAR"];
const permissaoConfigurar = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_CONFIGURAR"];
const permissaoLogs = ["ADMINISTRADOR", "DATAS_COMEMORATIVAS_VISUALIZAR_LOGS"];

datasComemorativasRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.listar.bind(controller))
);
datasComemorativasRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissaoCadastrar),
  asyncHandler(controller.criar.bind(controller))
);
datasComemorativasRoutes.get(
  "/calendario",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.calendario.bind(controller))
);
datasComemorativasRoutes.get(
  "/do-dia",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.doDia.bind(controller))
);
datasComemorativasRoutes.get(
  "/exportar",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.exportar.bind(controller))
);
datasComemorativasRoutes.post(
  "/sync/feriados",
  ensureAuthenticated,
  ensurePermissions(permissaoSincronizar),
  asyncHandler(controller.sincronizarFeriados.bind(controller))
);
datasComemorativasRoutes.post(
  "/sync/feriados/intervalo",
  ensureAuthenticated,
  ensurePermissions(permissaoSincronizar),
  asyncHandler(controller.sincronizarIntervalo.bind(controller))
);
datasComemorativasRoutes.post(
  "/importar",
  ensureAuthenticated,
  ensurePermissions(permissaoImportar),
  asyncHandler(controller.importar.bind(controller))
);
datasComemorativasRoutes.get(
  "/sync/logs",
  ensureAuthenticated,
  ensurePermissions(permissaoLogs),
  asyncHandler(controller.listarSyncLogs.bind(controller))
);
datasComemorativasRoutes.get(
  "/configuracoes",
  ensureAuthenticated,
  ensurePermissions(permissaoConfigurar),
  asyncHandler(controller.configuracoes.bind(controller))
);
datasComemorativasRoutes.put(
  "/configuracoes",
  ensureAuthenticated,
  ensurePermissions(permissaoConfigurar),
  asyncHandler(controller.salvarConfiguracoes.bind(controller))
);
datasComemorativasRoutes.get(
  "/popup/hoje",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.popupHoje.bind(controller))
);
datasComemorativasRoutes.post(
  "/popup/registrar-visualizacao",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.registrarVisualizacao.bind(controller))
);
datasComemorativasRoutes.post(
  "/popup/dispensar-hoje",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.dispensarHoje.bind(controller))
);
datasComemorativasRoutes.get(
  "/logs",
  ensureAuthenticated,
  ensurePermissions(permissaoLogs),
  asyncHandler(controller.logs.bind(controller))
);
datasComemorativasRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoVisualizar),
  asyncHandler(controller.buscarPorId.bind(controller))
);
datasComemorativasRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoEditar),
  asyncHandler(controller.atualizar.bind(controller))
);
datasComemorativasRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExcluir),
  asyncHandler(controller.excluir.bind(controller))
);
datasComemorativasRoutes.patch(
  "/:id/ativar",
  ensureAuthenticated,
  ensurePermissions(permissaoAtivar),
  asyncHandler(controller.ativar.bind(controller))
);
datasComemorativasRoutes.patch(
  "/:id/inativar",
  ensureAuthenticated,
  ensurePermissions(permissaoAtivar),
  asyncHandler(controller.inativar.bind(controller))
);
datasComemorativasRoutes.post(
  "/:id/duplicar",
  ensureAuthenticated,
  ensurePermissions(permissaoCadastrar),
  asyncHandler(controller.duplicar.bind(controller))
);
