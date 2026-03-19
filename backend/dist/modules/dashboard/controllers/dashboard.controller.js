import { DashboardService } from "../services/dashboard.service.js";
import { DashboardGeorreferenciamentoService } from "../services/dashboard-georreferenciamento.service.js";
import { DashboardPowerBiService } from "../services/dashboard-power-bi.service.js";
import { DashboardVulnerabilidadeService } from "../services/dashboard-vulnerabilidade.service.js";
const service = new DashboardService();
const powerBiService = new DashboardPowerBiService();
const vulnerabilidadeService = new DashboardVulnerabilidadeService();
const georreferenciamentoService = new DashboardGeorreferenciamentoService();
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
    async listarOpcoesGeorreferenciamento(_request, response) {
        const payload = await georreferenciamentoService.listarOpcoesFiltros();
        return response.json(payload);
    }
    async consultarGeorreferenciamento(request, response) {
        const payload = await georreferenciamentoService.consultar(request.body, request.authUser);
        return response.json(payload);
    }
    async obterDetalheGeorreferenciamento(request, response) {
        const payload = await georreferenciamentoService.obterDetalheCompleto(String(request.params.id ?? ""), request.authUser);
        return response.json(payload);
    }
    async buscarVinculosGeorreferenciamento(request, response) {
        const payload = await georreferenciamentoService.buscarVinculos(request.query);
        return response.json({ itens: payload });
    }
    async salvarMarcacaoGeorreferenciamento(request, response) {
        const payload = await georreferenciamentoService.salvarMarcacao(request.body, request.authUser);
        return response.status(201).json(payload);
    }
    async geocodificarGeorreferenciamento(request, response) {
        const payload = await georreferenciamentoService.geocodificarPendentes(request.body, request.authUser);
        return response.json(payload);
    }
}
