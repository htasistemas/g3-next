import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { DoacaoRealizadaController } from "../controllers/doacao-realizada.controller.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";

const controller = new DoacaoRealizadaController();

export const doacaoRealizadaRoutes = Router();

const permissoesLeitura = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];
const permissoesEscrita = ["ADMINISTRADOR", "OPERADOR"];
const permissaoExclusao = ["ADMINISTRADOR"];

doacaoRealizadaRoutes.get(
  "/catalogo/beneficiarios",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarBeneficiarios.bind(controller))
);
doacaoRealizadaRoutes.get(
  "/catalogo/familias",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarFamilias.bind(controller))
);
doacaoRealizadaRoutes.get(
  "/catalogo/itens",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listarItensEstoque.bind(controller))
);

doacaoRealizadaRoutes.get(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.listar.bind(controller))
);
doacaoRealizadaRoutes.get(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesLeitura),
  asyncHandler(controller.buscarPorId.bind(controller))
);
doacaoRealizadaRoutes.post(
  "/",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.criar.bind(controller))
);
doacaoRealizadaRoutes.put(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissoesEscrita),
  asyncHandler(controller.atualizar.bind(controller))
);
doacaoRealizadaRoutes.delete(
  "/:id",
  ensureAuthenticated,
  ensurePermissions(permissaoExclusao),
  asyncHandler(controller.remover.bind(controller))
);
