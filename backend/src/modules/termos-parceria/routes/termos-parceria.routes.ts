import { Router } from "express";
import type { NextFunction, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions, type AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { TermosParceriaController } from "../controllers/termos-parceria.controller.js";

const controller = new TermosParceriaController();
const leitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "PARCERIAS_VISUALIZAR"];
const escrita = ["ADMINISTRADOR", "OPERADOR", "PARCERIAS_CRIAR", "PARCERIAS_EDITAR"];

function ensurePermissaoItem(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const usuario = request.authUser;
  const entidade = request.params.entidade;
  const permissao = entidade === "rubricas" ? "PARCERIAS_GERENCIAR_RUBRICAS" : entidade === "documentos" ? "PARCERIAS_DOCUMENTOS" : entidade === "receitas" || entidade === "despesas" ? "PARCERIAS_MOVIMENTAR_FINANCEIRO" : "PARCERIAS_EDITAR";
  if (!usuario) throw new AppError("Nao autenticado.", 401);
  if (usuario.permissoes.some((item) => ["ADMINISTRADOR", "OPERADOR", permissao].includes(item))) return next();
  throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
}

export const termosParceriaRoutes = Router();
termosParceriaRoutes.get("/dashboard", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.dashboard.bind(controller)));
termosParceriaRoutes.get("/", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.listar.bind(controller)));
termosParceriaRoutes.get("/:id", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.obter.bind(controller)));
termosParceriaRoutes.post("/", ensureAuthenticated, ensurePermissions(escrita), asyncHandler(controller.criar.bind(controller)));
termosParceriaRoutes.put("/:id", ensureAuthenticated, ensurePermissions([...escrita, "PARCERIAS_EDITAR"]), asyncHandler(controller.atualizar.bind(controller)));
termosParceriaRoutes.delete("/:id", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "PARCERIAS_EDITAR"]), asyncHandler(controller.excluir.bind(controller)));
termosParceriaRoutes.post("/:id/itens/:entidade", ensureAuthenticated, ensurePermissaoItem, asyncHandler(controller.criarFilho.bind(controller)));
termosParceriaRoutes.patch("/:id/itens/:entidade/:itemId", ensureAuthenticated, ensurePermissaoItem, asyncHandler(controller.atualizarFilho.bind(controller)));
termosParceriaRoutes.delete("/:id/itens/:entidade/:itemId", ensureAuthenticated, ensurePermissaoItem, asyncHandler(controller.excluirFilho.bind(controller)));
termosParceriaRoutes.post("/:id/unidades-executoras", ensureAuthenticated, ensurePermissions([...escrita, "PARCERIAS_EDITAR"]), asyncHandler(controller.criarUnidade.bind(controller)));
termosParceriaRoutes.post("/:id/aditivos", ensureAuthenticated, ensurePermissions([...escrita, "PARCERIAS_GERENCIAR_ADITIVOS"]), asyncHandler(controller.criarAditivo.bind(controller)));
