import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import {
  BancoEmpregosController,
  bancoEmpregosUploadMiddleware
} from "../controllers/banco-empregos.controller.js";

const controller = new BancoEmpregosController();
const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissoesExclusao = ["ADMINISTRADOR"];

export const bancoEmpregosRoutes = Router();

bancoEmpregosRoutes.get(
  "/dashboard",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.dashboard.bind(controller))
);

bancoEmpregosRoutes.get(
  "/exportar/:tipo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.exportar.bind(controller))
);

bancoEmpregosRoutes.get(
  "/historico",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarHistorico.bind(controller))
);

bancoEmpregosRoutes.get(
  "/candidatos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarCandidatos.bind(controller))
);

bancoEmpregosRoutes.post(
  "/candidatos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarCandidato.bind(controller))
);

bancoEmpregosRoutes.get(
  "/candidatos/:candidatoId",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarCandidato.bind(controller))
);

bancoEmpregosRoutes.put(
  "/candidatos/:candidatoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarCandidato.bind(controller))
);

bancoEmpregosRoutes.delete(
  "/candidatos/:candidatoId",
  ensureAuthenticated,
  ensurePermissions(permissoesExclusao),
  asyncHandler(controller.inativarCandidato.bind(controller))
);

bancoEmpregosRoutes.get(
  "/candidatos/:candidatoId/documentos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarDocumentos.bind(controller))
);

bancoEmpregosRoutes.post(
  "/candidatos/:candidatoId/documentos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  bancoEmpregosUploadMiddleware,
  asyncHandler(controller.adicionarDocumento.bind(controller))
);

bancoEmpregosRoutes.delete(
  "/documentos/:documentoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.removerDocumento.bind(controller))
);

bancoEmpregosRoutes.get(
  "/processos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarProcessos.bind(controller))
);

bancoEmpregosRoutes.post(
  "/processos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.vincularCandidato.bind(controller))
);

bancoEmpregosRoutes.get(
  "/processos/:processoId",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarProcesso.bind(controller))
);

bancoEmpregosRoutes.put(
  "/processos/:processoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarProcesso.bind(controller))
);

bancoEmpregosRoutes.put(
  "/processos/:processoId/avaliacao",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarAvaliacao.bind(controller))
);

bancoEmpregosRoutes.get(
  "/processos/:processoId/cartas/:tipo",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.gerarCarta.bind(controller))
);

bancoEmpregosRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);

bancoEmpregosRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);

bancoEmpregosRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obter.bind(controller))
);

bancoEmpregosRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);

bancoEmpregosRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesExclusao),
  asyncHandler(controller.excluir.bind(controller))
);
