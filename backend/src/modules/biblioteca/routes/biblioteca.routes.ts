import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { BibliotecaController } from "../controllers/biblioteca.controller.js";

const controller = new BibliotecaController();

export const bibliotecaRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

bibliotecaRoutes.get(
  "/livros",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarLivros.bind(controller))
);

bibliotecaRoutes.get(
  "/livros/next-code",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.obterProximoCodigoLivro.bind(controller))
);

bibliotecaRoutes.get(
  "/livros/isbn/:isbn",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.consultarLivroPorIsbn.bind(controller))
);

bibliotecaRoutes.post(
  "/livros",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarLivro.bind(controller))
);

bibliotecaRoutes.put(
  "/livros/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarLivro.bind(controller))
);

bibliotecaRoutes.delete(
  "/livros/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.excluirLivro.bind(controller))
);

bibliotecaRoutes.get(
  "/emprestimos",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarEmprestimos.bind(controller))
);

bibliotecaRoutes.post(
  "/emprestimos",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criarEmprestimo.bind(controller))
);

bibliotecaRoutes.put(
  "/emprestimos/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizarEmprestimo.bind(controller))
);

bibliotecaRoutes.delete(
  "/emprestimos/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.excluirEmprestimo.bind(controller))
);

bibliotecaRoutes.put(
  "/emprestimos/:id/devolucao",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.registrarDevolucao.bind(controller))
);

bibliotecaRoutes.get(
  "/alertas",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarAlertas.bind(controller))
);
