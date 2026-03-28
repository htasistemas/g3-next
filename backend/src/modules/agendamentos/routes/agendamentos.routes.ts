import { Router } from "express";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { AgendamentosController } from "../controllers/agendamentos.controller.js";

const controller = new AgendamentosController();
const agendamentosRoutes = Router();

const permissoesVisualizacao = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "AGENDAMENTOS_VISUALIZAR"
];

const permissoesEdicao = [
  "ADMINISTRADOR",
  "OPERADOR",
  "AGENDAMENTOS_CRIAR",
  "AGENDAMENTOS_EDITAR",
  "AGENDAMENTOS_CONFIRMAR",
  "AGENDAMENTOS_CHECKIN",
  "AGENDAMENTOS_CONCLUIR"
];

agendamentosRoutes.use(ensureAuthenticated);

agendamentosRoutes.get("/", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listar.bind(controller)));
agendamentosRoutes.get("/itens", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarItens.bind(controller)));
agendamentosRoutes.get("/beneficiarios", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarBeneficiarios.bind(controller)));
agendamentosRoutes.get("/indicadores", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.indicadores.bind(controller)));
agendamentosRoutes.get("/catalogos", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.catalogos.bind(controller)));
agendamentosRoutes.get("/lista-espera", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.listarListaEspera.bind(controller)));
agendamentosRoutes.post("/lista-espera", ensurePermissions(permissoesEdicao), asyncHandler(controller.criarListaEspera.bind(controller)));
agendamentosRoutes.post("/lista-espera/:id/converter", ensurePermissions(permissoesEdicao), asyncHandler(controller.converterListaEspera.bind(controller)));
agendamentosRoutes.get("/:id", ensurePermissions(permissoesVisualizacao), asyncHandler(controller.obter.bind(controller)));
agendamentosRoutes.post("/", ensurePermissions(permissoesEdicao), asyncHandler(controller.criar.bind(controller)));
agendamentosRoutes.put("/:id", ensurePermissions(permissoesEdicao), asyncHandler(controller.atualizar.bind(controller)));
agendamentosRoutes.post(
  "/:id/cancelar",
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CANCELAR"]),
  asyncHandler(controller.cancelar.bind(controller))
);
agendamentosRoutes.post(
  "/:id/remarcar",
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_REMARCAR"]),
  asyncHandler(controller.remarcar.bind(controller))
);
agendamentosRoutes.post(
  "/:id/confirmar",
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CONFIRMAR"]),
  asyncHandler(controller.confirmar.bind(controller))
);
agendamentosRoutes.post(
  "/:id/check-in",
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CHECKIN"]),
  asyncHandler(controller.checkIn.bind(controller))
);
agendamentosRoutes.post(
  "/:id/concluir",
  ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CONCLUIR"]),
  asyncHandler(controller.concluir.bind(controller))
);
agendamentosRoutes.post("/:id/notificar", ensurePermissions(permissoesEdicao), asyncHandler(controller.notificar.bind(controller)));

export { agendamentosRoutes };
