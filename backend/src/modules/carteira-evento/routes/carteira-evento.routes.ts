import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { CarteiraEventoController } from "../controllers/carteira-evento.controller.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";

const controller = new CarteiraEventoController();

export const carteiraEventoRoutes = Router();

const permissoesVisualizacao = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "SETOR_VENDAS_CARTEIRA_EVENTO_VISUALIZAR"
];
const permissoesEdicao = ["ADMINISTRADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_EDITAR"];
const permissoesRecarga = ["ADMINISTRADOR", "OPERADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_RECARGA"];
const permissoesTransferencia = ["ADMINISTRADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_TRANSFERIR"];
const permissoesAjuste = ["ADMINISTRADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_AJUSTAR"];
const permissoesOperacao = ["ADMINISTRADOR", "OPERADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_OPERAR"];
const permissoesFechamento = ["ADMINISTRADOR", "SETOR_VENDAS_CARTEIRA_EVENTO_FECHAR"];
const permissoesRelatorio = ["ADMINISTRADOR", "LEITURA_APENAS", "SETOR_VENDAS_CARTEIRA_EVENTO_RELATORIOS"];

carteiraEventoRoutes.use(ensureAuthenticated);

carteiraEventoRoutes.get("/eventos", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarEventos.bind(controller)));
carteiraEventoRoutes.post("/eventos", ensurePermissions(permissoesEdicao), asyncHandler(controller.criarEvento.bind(controller)));
carteiraEventoRoutes.put("/eventos/:id", ensurePermissions(permissoesEdicao), asyncHandler(controller.atualizarEvento.bind(controller)));

carteiraEventoRoutes.get("/participantes", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarParticipantes.bind(controller)));
carteiraEventoRoutes.get("/participantes/:id", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.buscarParticipante.bind(controller)));
carteiraEventoRoutes.post("/participantes", ensurePermissions(permissoesEdicao), asyncHandler(controller.criarParticipante.bind(controller)));
carteiraEventoRoutes.put("/participantes/:id", ensurePermissions(permissoesEdicao), asyncHandler(controller.atualizarParticipante.bind(controller)));
carteiraEventoRoutes.post("/participantes/:id/status", ensurePermissions(permissoesAjuste), asyncHandler(controller.alterarStatusParticipante.bind(controller)));
carteiraEventoRoutes.post("/participantes/:id/segunda-via", ensurePermissions(permissoesAjuste), asyncHandler(controller.emitirSegundaVia.bind(controller)));
carteiraEventoRoutes.get("/extrato", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarExtrato.bind(controller)));

carteiraEventoRoutes.get("/barracas", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarBarracas.bind(controller)));
carteiraEventoRoutes.post("/barracas", ensurePermissions(permissoesEdicao), asyncHandler(controller.criarBarraca.bind(controller)));
carteiraEventoRoutes.put("/barracas/:id", ensurePermissions(permissoesEdicao), asyncHandler(controller.atualizarBarraca.bind(controller)));

carteiraEventoRoutes.get("/itens", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarItens.bind(controller)));
carteiraEventoRoutes.post("/itens", ensurePermissions(permissoesEdicao), asyncHandler(controller.criarItem.bind(controller)));
carteiraEventoRoutes.put("/itens/:id", ensurePermissions(permissoesEdicao), asyncHandler(controller.atualizarItem.bind(controller)));

carteiraEventoRoutes.post("/recargas", ensurePermissions(permissoesRecarga), asyncHandler(controller.recarregar.bind(controller)));
carteiraEventoRoutes.post("/transferencias", ensurePermissions(permissoesTransferencia), asyncHandler(controller.transferir.bind(controller)));
carteiraEventoRoutes.post("/ajustes", ensurePermissions(permissoesAjuste), asyncHandler(controller.ajustar.bind(controller)));
carteiraEventoRoutes.post("/operacao/consultar-token", ensurePermissions(permissoesOperacao), asyncHandler(controller.consultarToken.bind(controller)));
carteiraEventoRoutes.post("/operacao/venda", ensurePermissions(permissoesOperacao), asyncHandler(controller.realizarVenda.bind(controller)));
carteiraEventoRoutes.post("/operacao/venda/:id/estornar", ensurePermissions(permissoesAjuste), asyncHandler(controller.estornarVenda.bind(controller)));

carteiraEventoRoutes.get("/dashboard", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.obterDashboard.bind(controller)));
carteiraEventoRoutes.get("/fechamento", ensurePermissions([...permissoesVisualizacao, ...permissoesFechamento]), asyncHandler(controller.obterFechamento.bind(controller)));
carteiraEventoRoutes.get("/relatorios", ensurePermissions([...permissoesVisualizacao, ...permissoesRelatorio]), asyncHandler(controller.obterRelatorio.bind(controller)));
carteiraEventoRoutes.get("/auditoria", ensurePermissions(permissoesRelatorio), asyncHandler(controller.obterAuditoria.bind(controller)));
carteiraEventoRoutes.post("/impressao", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.registrarImpressao.bind(controller)));
