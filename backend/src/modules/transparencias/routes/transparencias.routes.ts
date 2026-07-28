import { Router } from "express";
import type { NextFunction, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { TransparenciasController } from "../controllers/transparencias.controller.js";

const controller = new TransparenciasController();

export const transparenciasRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

function ensureWorkflowPermission(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const usuario = request.authUser;
  if (!usuario) throw new AppError("Nao autenticado.", 401);
  const acao = typeof request.body?.acao === "string" ? request.body.acao : "";
  const permissaoAcao = ["APROVAR", "APROVAR_RESSALVAS", "REJEITAR", "ENCERRAR"].includes(acao)
    ? ["ADMINISTRADOR", "PRESTACAO_CONTAS_APROVAR"]
    : ["ADMINISTRADOR", "OPERADOR", "PRESTACAO_CONTAS_REVISAR", "PRESTACAO_CONTAS_ELABORAR"];
  if (!usuario.permissoes.some((permissao) => permissaoAcao.includes(permissao))) {
    throw new AppError("Seu perfil nao possui permissao para esta etapa da prestacao de contas.", 403);
  }
  return next();
}

transparenciasRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);

transparenciasRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);

transparenciasRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obter.bind(controller))
);

transparenciasRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);

transparenciasRoutes.post(
  "/:id/workflow",
  ensureAuthenticated,
  ensurePermissions([
    ...permissoesEscrita,
    "PRESTACAO_CONTAS_ELABORAR",
    "PRESTACAO_CONTAS_REVISAR",
    "PRESTACAO_CONTAS_APROVAR"
  ]),
  ensureWorkflowPermission,
  asyncHandler(controller.alterarWorkflow.bind(controller))
);

transparenciasRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.excluir.bind(controller))
);
