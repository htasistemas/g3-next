import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { MatriculaController } from "../controllers/matricula.controller.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";

const controller = new MatriculaController();

export const matriculaRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

matriculaRoutes.get(
  "/catalogo/beneficiarios",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarBeneficiarios.bind(controller))
);
matriculaRoutes.get(
  "/catalogo/profissionais",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarProfissionais.bind(controller))
);
matriculaRoutes.get(
  "/catalogo/salas",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarSalas.bind(controller))
);
matriculaRoutes.get(
  "/resumo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterResumoCatalogo.bind(controller))
);

matriculaRoutes.get(
  "/:id/presencas/datas",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarPresencaDatas.bind(controller))
);
matriculaRoutes.post(
  "/:id/presencas/datas",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarPresencaData.bind(controller))
);
matriculaRoutes.put(
  "/:id/presencas/datas/:presencaDataId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarPresencaData.bind(controller))
);
matriculaRoutes.patch(
  "/:id/presencas/datas/:presencaDataId/cancelar",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.cancelarPresencaData.bind(controller))
);
matriculaRoutes.delete(
  "/:id/presencas/datas/:presencaDataId",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.removerPresencaData.bind(controller))
);
matriculaRoutes.get(
  "/:id/presencas/datas/:presencaDataId/itens",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarPresencasPorData.bind(controller))
);
matriculaRoutes.post(
  "/:id/presencas/datas/:presencaDataId/itens",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarPresencasPorData.bind(controller))
);
matriculaRoutes.post(
  "/:id/presencas/datas/:presencaDataId/validar-senha",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.validarSenhaPresenca.bind(controller))
);

matriculaRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
matriculaRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPorId.bind(controller))
);
matriculaRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);
matriculaRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
matriculaRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.remover.bind(controller))
);
