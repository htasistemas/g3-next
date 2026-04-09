import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { ChecklistDiarioController } from "../controllers/checklist-diario.controller.js";
const controller = new ChecklistDiarioController();
export const checklistDiarioRoutes = Router();
const permissoesLeitura = [
    "ADMINISTRADOR",
    "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_PROPRIO",
    "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
];
checklistDiarioRoutes.use(ensureAuthenticated);
checklistDiarioRoutes.get("/", ensurePermissions(permissoesLeitura), asyncHandler(controller.listarExecucoes.bind(controller)));
checklistDiarioRoutes.get("/semana", ensurePermissions(permissoesLeitura), asyncHandler(controller.listarSemana.bind(controller)));
checklistDiarioRoutes.get("/indicadores", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_INDICADORES", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"]), asyncHandler(controller.obterIndicadores.bind(controller)));
checklistDiarioRoutes.get("/historico", ensurePermissions(permissoesLeitura), asyncHandler(controller.listarHistorico.bind(controller)));
checklistDiarioRoutes.get("/modelos", ensurePermissions(permissoesLeitura), asyncHandler(controller.listarModelos.bind(controller)));
checklistDiarioRoutes.post("/modelos", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO"]), asyncHandler(controller.criarModelo.bind(controller)));
checklistDiarioRoutes.put("/modelos/:id", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO"]), asyncHandler(controller.atualizarModelo.bind(controller)));
checklistDiarioRoutes.post("/modelos/:id/clonar", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO"]), asyncHandler(controller.clonarModelo.bind(controller)));
checklistDiarioRoutes.patch("/modelos/:id/status", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO"]), asyncHandler(controller.atualizarStatusModelo.bind(controller)));
checklistDiarioRoutes.post("/gerar-semana", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO"]), asyncHandler(controller.gerarSemana.bind(controller)));
checklistDiarioRoutes.get("/configuracoes", ensurePermissions(permissoesLeitura), asyncHandler(controller.obterConfiguracao.bind(controller)));
checklistDiarioRoutes.put("/configuracoes", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_GERENCIAR_CONFIGURACOES"]), asyncHandler(controller.atualizarConfiguracao.bind(controller)));
checklistDiarioRoutes.get("/execucoes/:id", ensurePermissions(permissoesLeitura), asyncHandler(controller.obterExecucao.bind(controller)));
checklistDiarioRoutes.patch("/execucoes/:id/concluir", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CONCLUIR_ATIVIDADE"]), asyncHandler(controller.concluir.bind(controller)));
checklistDiarioRoutes.patch("/execucoes/:id/dispensar", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE"]), asyncHandler(controller.dispensar.bind(controller)));
checklistDiarioRoutes.patch("/execucoes/:id/nao-se-aplica", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE"]), asyncHandler(controller.marcarNaoSeAplica.bind(controller)));
checklistDiarioRoutes.patch("/execucoes/:id/reabrir", ensurePermissions(["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_REABRIR_ATIVIDADE"]), asyncHandler(controller.reabrir.bind(controller)));
