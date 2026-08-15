import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { UsuarioController } from "../controllers/usuario.controller.js";

const controller = new UsuarioController();

export const usuarioRoutes = Router();

const permissoesAdministracaoUsuarios = ["ADMINISTRADOR"];

usuarioRoutes.get(
  "/permissoes",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.listarPermissoes.bind(controller))
);

usuarioRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.listar.bind(controller))
);

// Deve ficar antes de /:id para que "catalogo-acessos" não seja interpretado
// como identificador de usuário.
usuarioRoutes.get(
  "/catalogo-acessos",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.listarCatalogoAcessos.bind(controller))
);

usuarioRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.buscarPorId.bind(controller))
);

usuarioRoutes.get(
  "/:id/face",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.buscarFace.bind(controller))
);

usuarioRoutes.get(
  "/:id/acessos",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.listarAcessos.bind(controller))
);

usuarioRoutes.put(
  "/:id/acessos",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.substituirAcessos.bind(controller))
);

usuarioRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.criar.bind(controller))
);

usuarioRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.atualizar.bind(controller))
);

usuarioRoutes.put(
  "/:id/face",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.salvarFace.bind(controller))
);

usuarioRoutes.patch(
  "/:id/status",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.atualizarStatus.bind(controller))
);

usuarioRoutes.post(
  "/:id/reset-senha",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.resetarSenha.bind(controller))
);

usuarioRoutes.delete(
  "/:id/face",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.removerFace.bind(controller))
);

usuarioRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesAdministracaoUsuarios),
  asyncHandler(controller.remover.bind(controller))
);
