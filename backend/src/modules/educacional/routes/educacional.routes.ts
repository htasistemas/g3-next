import { Router } from "express";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { EducacionalController } from "../controllers/educacional.controller.js";

const controller = new EducacionalController();
const visualizar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_VISUALIZAR", "EDUCACIONAL_MATRICULAS_VISUALIZAR"]);
const editar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ESTRUTURA_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR", "EDUCACIONAL_ENTURMACAO_EDITAR"]);
const permissaoPorRecurso: Partial<Record<string, string[]>> = {
  alunos: ["EDUCACIONAL_ALUNOS_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR"],
  matriculas: ["EDUCACIONAL_MATRICULAS_EDITAR"],
  enturmacoes: ["EDUCACIONAL_ENTURMACAO_EDITAR"],
  diarios: ["EDUCACIONAL_DIARIO_EDITAR"],
  frequencias: ["EDUCACIONAL_FREQUENCIA_EDITAR"],
  avaliacoes: ["EDUCACIONAL_AVALIACOES_EDITAR"],
  notas: ["EDUCACIONAL_NOTAS_EDITAR"],
  boletins: ["EDUCACIONAL_BOLETINS_EDITAR"],
  documentos: ["EDUCACIONAL_DOCUMENTOS_EDITAR"],
  transferencias: ["EDUCACIONAL_TRANSFERENCIAS"],
  autorizacoes: ["EDUCACIONAL_AUTORIZACOES"],
  "lista-espera": ["EDUCACIONAL_LISTA_ESPERA", "EDUCACIONAL_MATRICULAS_EDITAR"],
  recuperacoes: ["EDUCACIONAL_RECUPERACAO"],
  "resultados-finais": ["EDUCACIONAL_RESULTADO_FINAL"],
  calendario: ["EDUCACIONAL_CALENDARIO", "EDUCACIONAL_ESTRUTURA_EDITAR"]
};
const editarPorRecurso = (request: Parameters<ReturnType<typeof ensurePermissions>>[0], response: Parameters<ReturnType<typeof ensurePermissions>>[1], next: Parameters<ReturnType<typeof ensurePermissions>>[2]) => {
  const permissoes = permissaoPorRecurso[request.params.recurso] ?? ["EDUCACIONAL_ESTRUTURA_EDITAR"];
  return ensurePermissions(["ADMINISTRADOR", "OPERADOR", ...permissoes])(request, response, next);
};
export const educacionalRoutes = Router();
educacionalRoutes.use(ensureAuthenticated);
educacionalRoutes.get("/resumo", visualizar, controller.resumo.bind(controller));
educacionalRoutes.get("/alunos/busca", visualizar, controller.buscarBeneficiarios.bind(controller));
educacionalRoutes.get("/unidades-ensino", visualizar, controller.listarUnidadesEnsino.bind(controller));
educacionalRoutes.post("/alunos/vincular", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ALUNOS_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR"]), controller.vincularAluno.bind(controller));
educacionalRoutes.get("/:recurso", visualizar, controller.listar.bind(controller));
educacionalRoutes.post("/:recurso", editarPorRecurso, controller.salvar.bind(controller));
educacionalRoutes.put("/:recurso/:id", editarPorRecurso, controller.salvar.bind(controller));
