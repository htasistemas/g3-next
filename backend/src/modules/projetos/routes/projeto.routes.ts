import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { ProjetoController } from "../controllers/projeto.controller.js";

const controller = new ProjetoController();
const uploadEvidencia = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }).single("arquivo");

export const projetoRoutes = Router();

const permissaoVisualizar = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "SETOR_ADMINISTRATIVO_PROJETOS_VISUALIZAR"];
const permissaoCriar = ["ADMINISTRADOR", "OPERADOR", "SETOR_ADMINISTRATIVO_PROJETOS_CRIAR"];
const permissaoEditar = ["ADMINISTRADOR", "OPERADOR", "SETOR_ADMINISTRATIVO_PROJETOS_EDITAR"];
const permissaoExcluir = ["ADMINISTRADOR", "SETOR_ADMINISTRATIVO_PROJETOS_EXCLUIR"];
const permissaoTarefas = ["ADMINISTRADOR", "OPERADOR", "SETOR_ADMINISTRATIVO_PROJETOS_GERENCIAR_TAREFAS"];
const permissaoKanban = ["ADMINISTRADOR", "OPERADOR", "SETOR_ADMINISTRATIVO_PROJETOS_MOVER_TAREFAS_KANBAN"];
const permissaoRelatorios = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "SETOR_ADMINISTRATIVO_PROJETOS_VISUALIZAR_RELATORIOS"];
const permissaoImprimir = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "SETOR_ADMINISTRATIVO_PROJETOS_IMPRIMIR_RELATORIOS"];
const permissaoIndicadores = ["ADMINISTRADOR", "OPERADOR", "SETOR_ADMINISTRATIVO_PROJETOS_EDITAR"];

projetoRoutes.get("/", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.listar.bind(controller)));
projetoRoutes.get("/dashboard", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.dashboard.bind(controller)));
projetoRoutes.post("/relatorios/:tipo/pdf", ensureAuthenticated, ensurePermissions([...permissaoRelatorios, ...permissaoImprimir]), asyncHandler(controller.gerarRelatorio.bind(controller)));
projetoRoutes.get("/indicadores/dashboard", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.dashboardIndicadores.bind(controller)));
projetoRoutes.get("/:id/indicadores", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.listarIndicadores.bind(controller)));
projetoRoutes.post("/:id/indicadores", ensureAuthenticated, ensurePermissions(permissaoIndicadores), asyncHandler(controller.criarIndicador.bind(controller)));
projetoRoutes.get("/:id/indicadores/:indicadorId/medicoes", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.listarMedicoesIndicador.bind(controller)));
projetoRoutes.post("/:id/indicadores/:indicadorId/medicoes", ensureAuthenticated, ensurePermissions(permissaoIndicadores), asyncHandler(controller.registrarMedicaoIndicador.bind(controller)));
projetoRoutes.get("/:id/indicadores/:indicadorId/evidencias", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.listarEvidenciasIndicador.bind(controller)));
projetoRoutes.post("/:id/indicadores/:indicadorId/evidencias", ensureAuthenticated, ensurePermissions(permissaoIndicadores), uploadEvidencia, asyncHandler(controller.enviarEvidenciaIndicador.bind(controller)));
projetoRoutes.get("/:id", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.buscarPorId.bind(controller)));
projetoRoutes.post("/", ensureAuthenticated, ensurePermissions(permissaoCriar), asyncHandler(controller.criar.bind(controller)));
projetoRoutes.put("/:id", ensureAuthenticated, ensurePermissions(permissaoEditar), asyncHandler(controller.atualizar.bind(controller)));
projetoRoutes.delete("/:id", ensureAuthenticated, ensurePermissions(permissaoExcluir), asyncHandler(controller.remover.bind(controller)));
projetoRoutes.get("/:id/historico", ensureAuthenticated, ensurePermissions(permissaoVisualizar), asyncHandler(controller.listarHistorico.bind(controller)));
projetoRoutes.post("/:id/tarefas", ensureAuthenticated, ensurePermissions(permissaoTarefas), asyncHandler(controller.criarTarefa.bind(controller)));
projetoRoutes.put("/:id/tarefas/:tarefaId", ensureAuthenticated, ensurePermissions(permissaoTarefas), asyncHandler(controller.atualizarTarefa.bind(controller)));
projetoRoutes.patch("/:id/tarefas/:tarefaId/status", ensureAuthenticated, ensurePermissions(permissaoKanban), asyncHandler(controller.moverTarefa.bind(controller)));
