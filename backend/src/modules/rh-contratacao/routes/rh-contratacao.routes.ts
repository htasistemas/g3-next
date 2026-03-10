import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { RhContratacaoController } from "../controllers/rh-contratacao.controller.js";

const controller = new RhContratacaoController();

export const rhContratacaoRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

rhContratacaoRoutes.get(
  "/candidatos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarCandidatos.bind(controller))
);

rhContratacaoRoutes.get(
  "/candidatos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarCandidato.bind(controller))
);

rhContratacaoRoutes.post(
  "/candidatos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarCandidato.bind(controller))
);

rhContratacaoRoutes.put(
  "/candidatos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarCandidato.bind(controller))
);

rhContratacaoRoutes.delete(
  "/candidatos/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.inativarCandidato.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/por-candidato/:candidatoId",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarProcessoPorCandidato.bind(controller))
);

rhContratacaoRoutes.put(
  "/processos/:processoId/status",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarStatus.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/entrevistas",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarEntrevistas.bind(controller))
);

rhContratacaoRoutes.post(
  "/processos/:processoId/entrevistas",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarEntrevista.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/ficha",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarFicha.bind(controller))
);

rhContratacaoRoutes.put(
  "/processos/:processoId/ficha",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarFicha.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/documentos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarDocumentos.bind(controller))
);

rhContratacaoRoutes.put(
  "/documentos/:documentoId",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarDocumento.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/arquivos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarArquivos.bind(controller))
);

rhContratacaoRoutes.post(
  "/processos/:processoId/arquivos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.adicionarArquivo.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/termos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarTermos.bind(controller))
);

rhContratacaoRoutes.post(
  "/processos/:processoId/termos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarTermo.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/ppd",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPpd.bind(controller))
);

rhContratacaoRoutes.put(
  "/processos/:processoId/ppd",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarPpd.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/carta-banco",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarCartaBanco.bind(controller))
);

rhContratacaoRoutes.put(
  "/processos/:processoId/carta-banco",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.salvarCartaBanco.bind(controller))
);

rhContratacaoRoutes.get(
  "/processos/:processoId/auditoria",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarAuditoria.bind(controller))
);
