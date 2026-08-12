import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { AutorizacaoComprasController } from "../controllers/autorizacao-compras.controller.js";

const controller = new AutorizacaoComprasController();

export const autorizacaoComprasRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

autorizacaoComprasRoutes.get(
  "/indicadores",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarIndicadores.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/catalogo/setores-solicitantes",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarSetoresSolicitantes.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/fornecedores/cnpj/:cnpj",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarFornecedorPorCnpj.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/fornecedores/documentos/:tipo/:documento",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.consultarDocumentoFornecedor.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarDetalhe.bind(controller))
);

autorizacaoComprasRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);

autorizacaoComprasRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.excluir.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/enviar-aprovacao",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.enviarParaAprovacao.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/aprovacoes",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.registrarAprovacao.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/:id/cotacoes",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarCotacoes.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/cotacoes",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarCotacao.bind(controller))
);

autorizacaoComprasRoutes.delete(
  "/:id/cotacoes/:quoteId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.excluirCotacao.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/fornecedor-vencedor",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.definirFornecedor.bind(controller))
);

autorizacaoComprasRoutes.get(
  "/:id/reservas-bancarias",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarReservas.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/reservas-bancarias",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.registrarReservaBancaria.bind(controller))
);

autorizacaoComprasRoutes.delete(
  "/:id/reservas-bancarias/:reservaId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerReservaBancaria.bind(controller))
);

autorizacaoComprasRoutes.post(
  "/:id/autorizacao-pagamento",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.gerarAutorizacaoPagamento.bind(controller))
);
