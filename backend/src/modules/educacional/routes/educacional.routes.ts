import { Router } from "express";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { EducacionalController } from "../controllers/educacional.controller.js";

const controller = new EducacionalController();
const visualizar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_VISUALIZAR", "EDUCACIONAL_MATRICULAS_VISUALIZAR"]);
const editar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ESTRUTURA_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR", "EDUCACIONAL_ENTURMACAO_EDITAR"]);
export const educacionalRoutes = Router();
educacionalRoutes.use(ensureAuthenticated);
educacionalRoutes.get("/resumo", visualizar, controller.resumo.bind(controller));
educacionalRoutes.get("/alunos/busca", visualizar, controller.buscarBeneficiarios.bind(controller));
educacionalRoutes.post("/alunos/vincular", editar, controller.vincularAluno.bind(controller));
educacionalRoutes.get("/:recurso", visualizar, controller.listar.bind(controller));
educacionalRoutes.post("/:recurso", editar, controller.salvar.bind(controller));
educacionalRoutes.put("/:recurso/:id", editar, controller.salvar.bind(controller));
