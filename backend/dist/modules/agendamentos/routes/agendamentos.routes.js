import { Router } from "express";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
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
agendamentosRoutes.get("/", ensurePermissions(permissoesVisualizacao), controller.listar.bind(controller));
agendamentosRoutes.get("/itens", ensurePermissions(permissoesVisualizacao), controller.listarItens.bind(controller));
agendamentosRoutes.get("/beneficiarios", ensurePermissions(permissoesVisualizacao), controller.listarBeneficiarios.bind(controller));
agendamentosRoutes.get("/indicadores", ensurePermissions(permissoesVisualizacao), controller.indicadores.bind(controller));
agendamentosRoutes.get("/catalogos", ensurePermissions(permissoesVisualizacao), controller.catalogos.bind(controller));
agendamentosRoutes.get("/lista-espera", ensurePermissions(permissoesVisualizacao), controller.listarListaEspera.bind(controller));
agendamentosRoutes.post("/lista-espera", ensurePermissions(permissoesEdicao), controller.criarListaEspera.bind(controller));
agendamentosRoutes.post("/lista-espera/:id/converter", ensurePermissions(permissoesEdicao), controller.converterListaEspera.bind(controller));
agendamentosRoutes.get("/:id", ensurePermissions(permissoesVisualizacao), controller.obter.bind(controller));
agendamentosRoutes.post("/", ensurePermissions(permissoesEdicao), controller.criar.bind(controller));
agendamentosRoutes.put("/:id", ensurePermissions(permissoesEdicao), controller.atualizar.bind(controller));
agendamentosRoutes.post("/:id/cancelar", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CANCELAR"]), controller.cancelar.bind(controller));
agendamentosRoutes.post("/:id/remarcar", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_REMARCAR"]), controller.remarcar.bind(controller));
agendamentosRoutes.post("/:id/confirmar", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CONFIRMAR"]), controller.confirmar.bind(controller));
agendamentosRoutes.post("/:id/check-in", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CHECKIN"]), controller.checkIn.bind(controller));
agendamentosRoutes.post("/:id/concluir", ensurePermissions(["ADMINISTRADOR", "OPERADOR", "AGENDAMENTOS_CONCLUIR"]), controller.concluir.bind(controller));
agendamentosRoutes.post("/:id/notificar", ensurePermissions(permissoesEdicao), controller.notificar.bind(controller));
export { agendamentosRoutes };
