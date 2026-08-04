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
import { PrestacaoContasProfissionalController } from "../controllers/prestacao-contas-profissional.controller.js";

const controller = new TransparenciasController();
const profissionalController = new PrestacaoContasProfissionalController();

export const transparenciasRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];
const permissoesProfissionaisLeitura = [
  ...permissoesLeitura,
  "PRESTACAO_CONTAS_VISUALIZAR",
  "PRESTACAO_CONTAS_AUDITORIA"
];
const permissoesProfissionaisEscrita = [
  ...permissoesEscrita,
  "PRESTACAO_CONTAS_CRIAR",
  "PRESTACAO_CONTAS_EDITAR",
  "PRESTACAO_CONTAS_LANCAR_RECEITA",
  "PRESTACAO_CONTAS_LANCAR_DESPESA",
  "PRESTACAO_CONTAS_CONCILIAR",
  "PRESTACAO_CONTAS_RESPONDER_DILIGENCIA",
  "PRESTACAO_CONTAS_APROVAR"
];

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
  "/profissional/visao-geral",
  ensureAuthenticated,
  ensurePermissions(permissoesProfissionaisLeitura),
  asyncHandler(profissionalController.visaoGeral.bind(profissionalController))
);

transparenciasRoutes.get(
  "/profissional/auditoria",
  ensureAuthenticated,
  ensurePermissions(permissoesProfissionaisLeitura),
  asyncHandler(profissionalController.auditoria.bind(profissionalController))
);

transparenciasRoutes.get(
  "/profissional/ia",
  ensureAuthenticated,
  ensurePermissions(permissoesProfissionaisLeitura),
  asyncHandler(profissionalController.listarConfiguracoesIa.bind(profissionalController))
);

transparenciasRoutes.put(
  "/profissional/ia",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "PRESTACAO_CONTAS_CONFIGURAR_IA"]),
  asyncHandler(profissionalController.salvarConfiguracaoIa.bind(profissionalController))
);

transparenciasRoutes.post(
  "/profissional/ia/testar",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "PRESTACAO_CONTAS_CONFIGURAR_IA", "PRESTACAO_CONTAS_ACESSAR_IA"]),
  asyncHandler(profissionalController.testarConfiguracaoIa.bind(profissionalController))
);

transparenciasRoutes.post(
  "/profissional/ocr/analisar-documento",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "PRESTACAO_CONTAS_ACESSAR_IA"]),
  asyncHandler(profissionalController.analisarDocumento.bind(profissionalController))
);

transparenciasRoutes.post(
  "/profissional/assistente",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "PRESTACAO_CONTAS_ACESSAR_IA"]),
  asyncHandler(profissionalController.assistente.bind(profissionalController))
);

transparenciasRoutes.get(
  "/profissional/:entidade",
  ensureAuthenticated,
  ensurePermissions(permissoesProfissionaisLeitura),
  asyncHandler(profissionalController.listar.bind(profissionalController))
);

transparenciasRoutes.post(
  "/profissional/:entidade",
  ensureAuthenticated,
  ensurePermissions(permissoesProfissionaisEscrita),
  asyncHandler(profissionalController.criar.bind(profissionalController))
);

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
