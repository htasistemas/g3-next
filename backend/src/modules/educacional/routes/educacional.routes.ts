import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { EducacionalController } from "../controllers/educacional.controller.js";

const controller = new EducacionalController();
const visualizar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_VISUALIZAR", "EDUCACIONAL_MATRICULAS_VISUALIZAR"]);
const editar = ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ESTRUTURA_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR", "EDUCACIONAL_ENTURMACAO_EDITAR"]);
const permissaoPorRecurso: Partial<Record<string, string[]>> = {
  alunos: ["EDUCACIONAL_ALUNOS_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR"],
  profissionais: ["EDUCACIONAL_PROFISSIONAIS_EDITAR"],
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
  calendario: ["EDUCACIONAL_CALENDARIO", "EDUCACIONAL_ESTRUTURA_EDITAR"],
  configuracoes: ["EDUCACIONAL_CONFIGURACOES_EDITAR", "EDUCACIONAL_ESTRUTURA_EDITAR"]
};
const permissaoVisualizacaoPorRecurso: Partial<Record<string, string[]>> = {
  profissionais: ["EDUCACIONAL_PROFISSIONAIS_VISUALIZAR"],
  alunos: ["EDUCACIONAL_ALUNOS_VISUALIZAR"],
  diarios: ["EDUCACIONAL_DIARIO_VISUALIZAR"],
  frequencias: ["EDUCACIONAL_FREQUENCIA_VISUALIZAR"],
  avaliacoes: ["EDUCACIONAL_AVALIACOES_VISUALIZAR"],
  notas: ["EDUCACIONAL_NOTAS_VISUALIZAR"],
  boletins: ["EDUCACIONAL_BOLETINS_VISUALIZAR"],
  documentos: ["EDUCACIONAL_DOCUMENTOS_VISUALIZAR"],
  configuracoes: ["EDUCACIONAL_CONFIGURACOES_VISUALIZAR", "EDUCACIONAL_ESTRUTURA_VISUALIZAR"]
};
const visualizarPorRecurso = (request: Parameters<ReturnType<typeof ensurePermissions>>[0], response: Parameters<ReturnType<typeof ensurePermissions>>[1], next: Parameters<ReturnType<typeof ensurePermissions>>[2]) => {
  const permissoes = permissaoVisualizacaoPorRecurso[request.params.recurso] ?? ["EDUCACIONAL_VISUALIZAR"];
  return ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", ...permissoes])(request, response, next);
};
const editarPorRecurso = (request: Parameters<ReturnType<typeof ensurePermissions>>[0], response: Parameters<ReturnType<typeof ensurePermissions>>[1], next: Parameters<ReturnType<typeof ensurePermissions>>[2]) => {
  const permissoes = permissaoPorRecurso[request.params.recurso] ?? ["EDUCACIONAL_ESTRUTURA_EDITAR"];
  return ensurePermissions(["ADMINISTRADOR", "OPERADOR", ...permissoes])(request, response, next);
};
export const educacionalRoutes = Router();
educacionalRoutes.use(ensureAuthenticated);
educacionalRoutes.get("/resumo", visualizar, asyncHandler(controller.resumo.bind(controller)));
educacionalRoutes.get("/pendencias/:tipo", visualizar, asyncHandler(controller.listarPendencias.bind(controller)));
educacionalRoutes.get("/alunos/busca", visualizar, asyncHandler(controller.buscarBeneficiarios.bind(controller)));
educacionalRoutes.get("/alunos/busca-matricula", visualizar, asyncHandler(controller.buscarAlunos.bind(controller)));
educacionalRoutes.get("/unidades-ensino", visualizar, asyncHandler(controller.listarUnidadesEnsino.bind(controller)));
educacionalRoutes.get("/alunos/agrupados", visualizar, asyncHandler(controller.listarAlunosAgrupados.bind(controller)));
educacionalRoutes.get("/alunos/:alunoId/vida-academica", visualizar, asyncHandler(controller.vidaAcademicaAluno.bind(controller)));
educacionalRoutes.get("/matriculas/proximo-numero", visualizar, asyncHandler(controller.proximoNumeroMatricula.bind(controller)));
educacionalRoutes.get("/diarios/:id/chamada", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_DIARIO_VISUALIZAR", "EDUCACIONAL_FREQUENCIA_VISUALIZAR"]), asyncHandler(controller.obterChamadaRapida.bind(controller)));
educacionalRoutes.post("/diarios/:id/chamada", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_DIARIO_EDITAR", "EDUCACIONAL_FREQUENCIA_EDITAR"]), asyncHandler(controller.salvarChamadaRapida.bind(controller)));
educacionalRoutes.post("/boletins/gerar", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_BOLETIM_EDITAR"]), asyncHandler(controller.gerarBoletimAutomatico.bind(controller)));
educacionalRoutes.post("/historicos/gerar", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_HISTORICO_EDITAR"]), asyncHandler(controller.gerarHistoricoAutomatico.bind(controller)));
educacionalRoutes.get("/recuperacoes/sugestoes", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_RECUPERACAO", "EDUCACIONAL_NOTAS_VISUALIZAR"]), asyncHandler(controller.sugerirRecuperacoes.bind(controller)));
educacionalRoutes.get("/matriculas/:id/historico", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "EDUCACIONAL_ALUNO_HISTORICO_VISUALIZAR", "EDUCACIONAL_MATRICULAS_VISUALIZAR"]), asyncHandler(controller.listarHistoricoMatricula.bind(controller)));
educacionalRoutes.post("/matriculas/:id/transferir", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ALUNO_TRANSFERIR"]), asyncHandler(controller.transferirMatricula.bind(controller)));
educacionalRoutes.post("/matriculas/rematricular-lote", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_MATRICULAS_EDITAR", "EDUCACIONAL_ALUNO_VINCULO_EDITAR"]), asyncHandler(controller.rematricularLote.bind(controller)));
educacionalRoutes.post("/matriculas/:id/rematricular", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_MATRICULAS_EDITAR", "EDUCACIONAL_ALUNO_VINCULO_EDITAR"]), asyncHandler(controller.rematricular.bind(controller)));
educacionalRoutes.put("/matriculas/:id/vinculo", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ALUNO_VINCULO_EDITAR"]), asyncHandler(controller.editarVinculoMatricula.bind(controller)));
educacionalRoutes.post("/alunos/:alunoId/vinculo", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ALUNO_VINCULO_EDITAR"]), asyncHandler(controller.criarVinculoAluno.bind(controller)));
educacionalRoutes.post("/alunos/vincular", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "EDUCACIONAL_ALUNOS_EDITAR", "EDUCACIONAL_MATRICULAS_EDITAR"]), asyncHandler(controller.vincularAluno.bind(controller)));
educacionalRoutes.get("/:recurso", visualizarPorRecurso, asyncHandler(controller.listar.bind(controller)));
educacionalRoutes.post("/:recurso", editarPorRecurso, asyncHandler(controller.salvar.bind(controller)));
educacionalRoutes.put("/:recurso/:id", editarPorRecurso, asyncHandler(controller.salvar.bind(controller)));
