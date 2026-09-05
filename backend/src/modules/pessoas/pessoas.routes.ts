import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../auth/middlewares/auth.middleware.js";
import { PessoasController } from "./pessoas.controller.js";

const controller = new PessoasController();
const leitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "PESSOAS_VISUALIZAR"];
const gestao = ["ADMINISTRADOR", "OPERADOR", "PESSOAS_GERENCIAR_VINCULOS"];

export const pessoasRoutes = Router();
pessoasRoutes.get("/", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.listar.bind(controller)));
pessoasRoutes.get("/duplicidades", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "PESSOAS_GERENCIAR_VINCULOS"]), asyncHandler(controller.listarDuplicidades.bind(controller)));
pessoasRoutes.patch("/duplicidades/:pessoaId/revisao", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "PESSOAS_GERENCIAR_VINCULOS"]), asyncHandler(controller.revisarDuplicidade.bind(controller)));
pessoasRoutes.get("/:id", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.buscar.bind(controller)));
pessoasRoutes.get("/:id/vinculos", ensureAuthenticated, ensurePermissions(leitura), asyncHandler(controller.listarVinculos.bind(controller)));
pessoasRoutes.get("/:id/vinculos/auditoria", ensureAuthenticated, ensurePermissions(["ADMINISTRADOR", "PESSOAS_GERENCIAR_VINCULOS"]), asyncHandler(controller.listarAuditoria.bind(controller)));
pessoasRoutes.post("/:id/vinculos", ensureAuthenticated, ensurePermissions(gestao), asyncHandler(controller.criarVinculo.bind(controller)));
pessoasRoutes.delete("/:id/vinculos/:vinculoId", ensureAuthenticated, ensurePermissions(gestao), asyncHandler(controller.desativarVinculo.bind(controller)));
