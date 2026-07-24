import { Router } from "express";
import { publicPortalRateLimit } from "../../auth/middlewares/auth-rate-limit.middleware.js";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { CaptacaoRecursosController } from "../controllers/captacao-recursos.controller.js";

const controller = new CaptacaoRecursosController();

export const captacaoRecursosRoutes = Router();

const permissaoDashboard = ["ADMINISTRADOR", "CAPTACAO_DASHBOARD_VISUALIZAR"];
const permissaoDoadoresView = ["ADMINISTRADOR", "CAPTACAO_DOADORES_VISUALIZAR"];
const permissaoDoadoresEdit = ["ADMINISTRADOR", "CAPTACAO_DOADORES_CADASTRAR", "CAPTACAO_DOADORES_EDITAR"];
const permissaoDoadoresInativar = ["ADMINISTRADOR", "CAPTACAO_DOADORES_INATIVAR"];
const permissaoDoacoesView = ["ADMINISTRADOR", "CAPTACAO_DOACOES_VISUALIZAR"];
const permissaoDoacoesEdit = ["ADMINISTRADOR", "CAPTACAO_DOACOES_CADASTRAR"];
const permissaoConfirmar = ["ADMINISTRADOR", "CAPTACAO_DOACOES_CONFIRMAR"];
const permissaoCancelar = ["ADMINISTRADOR", "CAPTACAO_DOACOES_CANCELAR"];
const permissaoEstornar = ["ADMINISTRADOR", "CAPTACAO_DOACOES_ESTORNAR"];
const permissaoCobranca = ["ADMINISTRADOR", "CAPTACAO_COBRANCAS_GERAR"];
const permissaoCampanhasEdit = ["ADMINISTRADOR", "CAPTACAO_CAMPANHAS_CRIAR", "CAPTACAO_CAMPANHAS_EDITAR"];
const permissaoCampanhasPausar = ["ADMINISTRADOR", "CAPTACAO_CAMPANHAS_PAUSAR", "CAPTACAO_CAMPANHAS_ENCERRAR"];
const permissaoComprovantes = ["ADMINISTRADOR", "CAPTACAO_COMPROVANTES_EMITIR"];
const permissaoConfig = ["ADMINISTRADOR", "CAPTACAO_CONFIGURAR"];
const permissaoRelatorios = ["ADMINISTRADOR", "CAPTACAO_RELATORIOS_VISUALIZAR", "CAPTACAO_RELATORIOS_EXPORTAR"];

captacaoRecursosRoutes.get(
  "/dashboard",
  ensureAuthenticated,
  ensurePermissions(permissaoDashboard),
  asyncHandler(controller.dashboard.bind(controller))
);

captacaoRecursosRoutes.get(
  "/doadores",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresView),
  asyncHandler(controller.listarDoadores.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doadores",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresEdit),
  asyncHandler(controller.salvarDoador.bind(controller))
);
captacaoRecursosRoutes.get(
  "/doadores/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresView),
  asyncHandler(controller.buscarDoador.bind(controller))
);
captacaoRecursosRoutes.put(
  "/doadores/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresEdit),
  asyncHandler(controller.salvarDoador.bind(controller))
);
captacaoRecursosRoutes.patch(
  "/doadores/:id/inativar",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresInativar),
  asyncHandler(controller.inativarDoador.bind(controller))
);
captacaoRecursosRoutes.get(
  "/doadores/:id/tarefas",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresView),
  asyncHandler(controller.listarTarefasRelacionamento.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doadores/:id/tarefas",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresEdit),
  asyncHandler(controller.salvarTarefaRelacionamento.bind(controller))
);
captacaoRecursosRoutes.patch(
  "/tarefas-relacionamento/:id/concluir",
  ensureAuthenticated,
  ensurePermissions(permissaoDoadoresEdit),
  asyncHandler(controller.concluirTarefaRelacionamento.bind(controller))
);

captacaoRecursosRoutes.get(
  "/campanhas",
  ensureAuthenticated,
  ensurePermissions(permissaoDashboard),
  asyncHandler(controller.listarCampanhas.bind(controller))
);
captacaoRecursosRoutes.post(
  "/campanhas",
  ensureAuthenticated,
  ensurePermissions(permissaoCampanhasEdit),
  asyncHandler(controller.salvarCampanha.bind(controller))
);
captacaoRecursosRoutes.get(
  "/campanhas/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoDashboard),
  asyncHandler(controller.buscarCampanha.bind(controller))
);
captacaoRecursosRoutes.put(
  "/campanhas/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoCampanhasEdit),
  asyncHandler(controller.salvarCampanha.bind(controller))
);
captacaoRecursosRoutes.patch(
  "/campanhas/:id/status",
  ensureAuthenticated,
  ensurePermissions(permissaoCampanhasPausar),
  asyncHandler(controller.alterarStatusCampanha.bind(controller))
);

captacaoRecursosRoutes.get(
  "/doacoes",
  ensureAuthenticated,
  ensurePermissions(permissaoDoacoesView),
  asyncHandler(controller.listarDoacoes.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes",
  ensureAuthenticated,
  ensurePermissions(permissaoDoacoesEdit),
  asyncHandler(controller.salvarDoacao.bind(controller))
);
captacaoRecursosRoutes.get(
  "/doacoes/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoDoacoesView),
  asyncHandler(controller.buscarDoacao.bind(controller))
);
captacaoRecursosRoutes.put(
  "/doacoes/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoDoacoesEdit),
  asyncHandler(controller.salvarDoacao.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/gerar-cobranca",
  ensureAuthenticated,
  ensurePermissions(permissaoCobranca),
  asyncHandler(controller.gerarCobranca.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/confirmar",
  ensureAuthenticated,
  ensurePermissions(permissaoConfirmar),
  asyncHandler(controller.confirmarDoacao.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/cancelar",
  ensureAuthenticated,
  ensurePermissions(permissaoCancelar),
  asyncHandler(controller.cancelarDoacao.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/estornar",
  ensureAuthenticated,
  ensurePermissions(permissaoEstornar),
  asyncHandler(controller.estornarDoacao.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/emitir-comprovante",
  ensureAuthenticated,
  ensurePermissions(permissaoComprovantes),
  asyncHandler(controller.emitirComprovante.bind(controller))
);
captacaoRecursosRoutes.post(
  "/doacoes/:id/reenviar-comprovante",
  ensureAuthenticated,
  ensurePermissions(["ADMINISTRADOR", "CAPTACAO_COMPROVANTES_REENVIAR"]),
  asyncHandler(controller.reenviarComprovante.bind(controller))
);

captacaoRecursosRoutes.get(
  "/comprovantes",
  ensureAuthenticated,
  ensurePermissions(permissaoDoacoesView),
  asyncHandler(controller.listarComprovantes.bind(controller))
);
captacaoRecursosRoutes.get(
  "/configuracoes",
  ensureAuthenticated,
  ensurePermissions(permissaoConfig),
  asyncHandler(controller.configuracoes.bind(controller))
);
captacaoRecursosRoutes.put(
  "/configuracoes",
  ensureAuthenticated,
  ensurePermissions(permissaoConfig),
  asyncHandler(controller.salvarConfiguracoes.bind(controller))
);
captacaoRecursosRoutes.get(
  "/logs",
  ensureAuthenticated,
  ensurePermissions(permissaoRelatorios),
  asyncHandler(controller.logs.bind(controller))
);
captacaoRecursosRoutes.get(
  "/relatorios/exportar",
  ensureAuthenticated,
  ensurePermissions(permissaoRelatorios),
  asyncHandler(controller.exportar.bind(controller))
);

captacaoRecursosRoutes.post("/portal/login", publicPortalRateLimit, asyncHandler(controller.portalLogin.bind(controller)));
captacaoRecursosRoutes.get("/portal/painel", publicPortalRateLimit, asyncHandler(controller.portalPainel.bind(controller)));
captacaoRecursosRoutes.put("/portal/meus-dados", publicPortalRateLimit, asyncHandler(controller.portalAtualizarDados.bind(controller)));
captacaoRecursosRoutes.post("/portal/doacoes", publicPortalRateLimit, asyncHandler(controller.portalCriarDoacao.bind(controller)));
captacaoRecursosRoutes.post(
  "/portal/recorrencias/:id/cancelar",
  publicPortalRateLimit,
  asyncHandler(controller.portalCancelarRecorrencia.bind(controller))
);
