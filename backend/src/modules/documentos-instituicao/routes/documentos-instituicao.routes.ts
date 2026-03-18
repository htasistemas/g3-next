import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { DocumentosInstituicaoController } from "../controllers/documentos-instituicao.controller.js";

const controller = new DocumentosInstituicaoController();

export const documentosInstituicaoRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

documentosInstituicaoRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
documentosInstituicaoRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);

documentosInstituicaoRoutes.get(
  "/:id/anexos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarAnexos.bind(controller))
);
documentosInstituicaoRoutes.post(
  "/:id/anexos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.adicionarAnexo.bind(controller))
);
documentosInstituicaoRoutes.put(
  "/:id/anexos/:anexoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.substituirAnexo.bind(controller))
);
documentosInstituicaoRoutes.delete(
  "/:id/anexos/:anexoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.excluirAnexo.bind(controller))
);
documentosInstituicaoRoutes.get(
  "/:id/anexos/:anexoId/arquivo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterArquivoAnexo.bind(controller))
);
documentosInstituicaoRoutes.get(
  "/:id/historico",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarHistorico.bind(controller))
);
documentosInstituicaoRoutes.post(
  "/:id/historico",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.adicionarHistorico.bind(controller))
);

documentosInstituicaoRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
documentosInstituicaoRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.excluir.bind(controller))
);
