import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { MensagensPersonalizadasController } from "../controllers/mensagens-personalizadas.controller.js";

const controller = new MensagensPersonalizadasController();

export const mensagensPersonalizadasRoutes = Router();

const permissoesVisualizacao = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "MENSAGENS_PERSONALIZADAS_VISUALIZAR",
  "MENSAGENS_PERSONALIZADAS_HISTORICO"
];

const permissoesCadastro = [
  "ADMINISTRADOR",
  "OPERADOR",
  "MENSAGENS_PERSONALIZADAS_CADASTRAR",
  "MENSAGENS_PERSONALIZADAS_EDITAR"
];

const permissoesExclusao = ["ADMINISTRADOR", "MENSAGENS_PERSONALIZADAS_EXCLUIR"];
const permissoesEnvio = ["ADMINISTRADOR", "OPERADOR", "MENSAGENS_PERSONALIZADAS_ENVIAR"];
const permissoesEnvioLote = ["ADMINISTRADOR", "OPERADOR", "MENSAGENS_PERSONALIZADAS_ENVIAR_LOTE"];

mensagensPersonalizadasRoutes.get(
  "/suporte",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterSuporte.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/modelos",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.listarModelos.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/modelos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.obterModelo.bind(controller))
);

mensagensPersonalizadasRoutes.post(
  "/modelos",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.criarModelo.bind(controller))
);

mensagensPersonalizadasRoutes.put(
  "/modelos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.atualizarModelo.bind(controller))
);

mensagensPersonalizadasRoutes.post(
  "/modelos/:id/duplicar",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.duplicarModelo.bind(controller))
);

mensagensPersonalizadasRoutes.patch(
  "/modelos/:id/status",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.atualizarStatusModelo.bind(controller))
);

mensagensPersonalizadasRoutes.delete(
  "/modelos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesExclusao),
  asyncHandler(controller.excluirModelo.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/taxonomias",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.listarTaxonomias.bind(controller))
);

mensagensPersonalizadasRoutes.post(
  "/taxonomias",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.criarTaxonomia.bind(controller))
);

mensagensPersonalizadasRoutes.put(
  "/taxonomias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesCadastro),
  asyncHandler(controller.atualizarTaxonomia.bind(controller))
);

mensagensPersonalizadasRoutes.delete(
  "/taxonomias/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesExclusao),
  asyncHandler(controller.excluirTaxonomia.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/historico",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.listarHistorico.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/destinatarios/todos",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.buscarTodosDestinatarios.bind(controller))
);

mensagensPersonalizadasRoutes.get(
  "/destinatarios",
  ensureAuthenticated,
  ensurePermissions(permissoesVisualizacao),
  asyncHandler(controller.buscarDestinatarios.bind(controller))
);

mensagensPersonalizadasRoutes.post(
  "/preview",
  ensureAuthenticated,
  ensurePermissions(permissoesEnvio),
  asyncHandler(controller.gerarPreview.bind(controller))
);

mensagensPersonalizadasRoutes.post(
  "/enviar",
  ensureAuthenticated,
  ensurePermissions([...permissoesEnvio, ...permissoesEnvioLote]),
  asyncHandler(controller.enviarMensagem.bind(controller))
);
