import { Router } from "express";
import { ensureAuthenticated, ensurePermissions } from "../../auth/middlewares/auth.middleware.js";
import { CentralAtendimentosController } from "../controllers/central-atendimentos.controller.js";

const controller = new CentralAtendimentosController();
const router = Router();

const permissoesVisualizacao = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "CENTRAL_ATENDIMENTOS_VISUALIZAR"
];

const permissoesCustos = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "CENTRAL_ATENDIMENTOS_VISUALIZAR_CUSTOS"
];

const permissoesAtendimento = [
  "ADMINISTRADOR",
  "OPERADOR",
  "CENTRAL_ATENDIMENTOS_REGISTRAR_ATENDIMENTO"
];

const permissoesBeneficio = [
  "ADMINISTRADOR",
  "OPERADOR",
  "CENTRAL_ATENDIMENTOS_REGISTRAR_BENEFICIO"
];

const permissoesEncaminhamento = [
  "ADMINISTRADOR",
  "OPERADOR",
  "CENTRAL_ATENDIMENTOS_REGISTRAR_ENCAMINHAMENTO"
];

const permissoesEditar = ["ADMINISTRADOR", "OPERADOR", "CENTRAL_ATENDIMENTOS_EDITAR_REGISTROS"];
const permissoesExcluir = ["ADMINISTRADOR", "CENTRAL_ATENDIMENTOS_EXCLUIR_REGISTROS"];
const permissoesRelatorio = [
  "ADMINISTRADOR",
  "OPERADOR",
  "LEITURA_APENAS",
  "CENTRAL_ATENDIMENTOS_IMPRIMIR_RELATORIOS"
];

function asyncRoute(handler: (request: any, response: any) => Promise<any>) {
  return (request: any, response: any, next: any) => {
    void handler(request, response).catch(next);
  };
}

router.use(ensureAuthenticated);

router.get(
  "/beneficiarios/busca",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.buscarBeneficiarios.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.obterVisaoGeral.bind(controller))
);

router.get(
  "/beneficiarios/:beneficiarioId/atendimentos",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarAtendimentos.bind(controller))
);
router.post(
  "/beneficiarios/:beneficiarioId/atendimentos",
  ensurePermissions(permissoesAtendimento),
  asyncRoute(controller.criarAtendimento.bind(controller))
);
router.put(
  "/beneficiarios/:beneficiarioId/atendimentos/:id",
  ensurePermissions(permissoesEditar),
  asyncRoute(controller.atualizarAtendimento.bind(controller))
);
router.delete(
  "/beneficiarios/:beneficiarioId/atendimentos/:id",
  ensurePermissions(permissoesExcluir),
  asyncRoute(controller.removerAtendimento.bind(controller))
);

router.get(
  "/beneficiarios/:beneficiarioId/beneficios",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarBeneficios.bind(controller))
);
router.post(
  "/beneficiarios/:beneficiarioId/beneficios",
  ensurePermissions(permissoesBeneficio),
  asyncRoute(controller.criarBeneficio.bind(controller))
);
router.put(
  "/beneficiarios/:beneficiarioId/beneficios/:id",
  ensurePermissions(permissoesEditar),
  asyncRoute(controller.atualizarBeneficio.bind(controller))
);
router.delete(
  "/beneficiarios/:beneficiarioId/beneficios/:id",
  ensurePermissions(permissoesExcluir),
  asyncRoute(controller.removerBeneficio.bind(controller))
);

router.get(
  "/beneficiarios/:beneficiarioId/encaminhamentos",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarEncaminhamentos.bind(controller))
);
router.post(
  "/beneficiarios/:beneficiarioId/encaminhamentos",
  ensurePermissions(permissoesEncaminhamento),
  asyncRoute(controller.criarEncaminhamento.bind(controller))
);
router.put(
  "/beneficiarios/:beneficiarioId/encaminhamentos/:id",
  ensurePermissions(permissoesEditar),
  asyncRoute(controller.atualizarEncaminhamento.bind(controller))
);
router.delete(
  "/beneficiarios/:beneficiarioId/encaminhamentos/:id",
  ensurePermissions(permissoesExcluir),
  asyncRoute(controller.removerEncaminhamento.bind(controller))
);

router.get(
  "/beneficiarios/:beneficiarioId/historico",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarHistorico.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId/custos",
  ensurePermissions(permissoesCustos),
  asyncRoute(controller.listarCustos.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId/grupo-familiar",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarGrupoFamiliar.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId/alertas",
  ensurePermissions(permissoesVisualizacao),
  asyncRoute(controller.listarAlertas.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId/relatorios/:tipo",
  ensurePermissions(permissoesRelatorio),
  asyncRoute(controller.gerarRelatorio.bind(controller))
);
router.get(
  "/beneficiarios/:beneficiarioId/relatorios/:tipo/pdf",
  ensurePermissions(permissoesRelatorio),
  asyncRoute(controller.gerarRelatorioPdf.bind(controller))
);

export const centralAtendimentosRoutes = router;
