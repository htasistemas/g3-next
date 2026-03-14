import { DashboardService } from "../services/dashboard.service.js";
import { DashboardPowerBiService } from "../services/dashboard-power-bi.service.js";
import { DashboardVulnerabilidadeService } from "../services/dashboard-vulnerabilidade.service.js";
const service = new DashboardService();
const powerBiService = new DashboardPowerBiService();
const vulnerabilidadeService = new DashboardVulnerabilidadeService();
export class DashboardController {
    async obterAssistencia(request, response) {
        const dashboard = await service.obterAssistencia(request.query);
        return response.json(dashboard);
    }
    async obterPowerBi(request, response) {
        const dashboard = await powerBiService.obterPowerBi(request.query, request.authUser);
        return response.json(dashboard);
    }
    async obterDetalhamentoPowerBi(request, response) {
        const detalhamentoId = String(request.params.id ?? "");
        const detalhamento = await powerBiService.obterDetalhamento(detalhamentoId, request.query, request.authUser);
        return response.json(detalhamento);
    }
    async obterVulnerabilidade(_request, response) {
        const dashboard = await vulnerabilidadeService.obterMapa();
        return response.json(dashboard);
    }
    async geocodificarVulnerabilidade(request, response) {
        const limite = typeof request.body?.limite === "number" ? request.body.limite : Number(request.body?.limite);
        const resultado = await vulnerabilidadeService.geocodificarPendentes(Number.isFinite(limite) ? limite : 15);
        return response.json(resultado);
    }
}
