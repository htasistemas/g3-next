import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import {
  ChamadoTecnicoController,
  chamadoTecnicoUploadMiddleware
} from "../controllers/chamado-tecnico.controller.js";

const controller = new ChamadoTecnicoController();
const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR", "CHAMADO_TECNICO_DESENVOLVIMENTO"];
const permissoesAdmin = ["ADMINISTRADOR"];

export const chamadoTecnicoRoutes = Router();

chamadoTecnicoRoutes.get(
  "/catalogo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarCatalogo.bind(controller))
);

chamadoTecnicoRoutes.get(
  "/filtros-salvos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarFiltrosSalvos.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/filtros-salvos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarFiltro.bind(controller))
);

chamadoTecnicoRoutes.put(
  "/filtros-salvos/:filtroId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarFiltro.bind(controller))
);

chamadoTecnicoRoutes.delete(
  "/filtros-salvos/:filtroId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerFiltro.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/parametros",
  ensureAuthenticated,
  ensurePermissions(permissoesAdmin),
  asyncHandler(controller.salvarParametro.bind(controller))
);

chamadoTecnicoRoutes.put(
  "/parametros/:parametroId",
  ensureAuthenticated,
  ensurePermissions(permissoesAdmin),
  asyncHandler(controller.atualizarParametro.bind(controller))
);

chamadoTecnicoRoutes.get(
  "/exportar",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.exportar.bind(controller))
);

chamadoTecnicoRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);

chamadoTecnicoRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPorId.bind(controller))
);

chamadoTecnicoRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);

chamadoTecnicoRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.remover.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/:id/situacao",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.alterarSituacao.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/:id/comentarios",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.adicionarComentario.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/:id/vinculos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.adicionarVinculo.bind(controller))
);

chamadoTecnicoRoutes.delete(
  "/:id/vinculos/:vinculoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerVinculo.bind(controller))
);

chamadoTecnicoRoutes.post(
  "/:id/anexos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  chamadoTecnicoUploadMiddleware,
  asyncHandler(controller.adicionarAnexos.bind(controller))
);

chamadoTecnicoRoutes.delete(
  "/:id/anexos/:arquivoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerAnexo.bind(controller))
);
