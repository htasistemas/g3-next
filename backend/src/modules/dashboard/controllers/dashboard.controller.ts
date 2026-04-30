import type { Response } from "express";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { DashboardService } from "../services/dashboard.service.js";
import { DashboardGeorreferenciamentoService } from "../services/dashboard-georreferenciamento.service.js";
import { DashboardPowerBiService } from "../services/dashboard-power-bi.service.js";
import { DashboardVulnerabilidadeService } from "../services/dashboard-vulnerabilidade.service.js";

const service = new DashboardService();
const powerBiService = new DashboardPowerBiService();
const vulnerabilidadeService = new DashboardVulnerabilidadeService();
const georreferenciamentoService = new DashboardGeorreferenciamentoService();

export class DashboardController {
  async obterAssistencia(request: AuthenticatedRequest, response: Response) {
    const dashboard = await service.obterAssistencia(request.query, request.authUser?.tenant_id);
    return response.json(dashboard);
  }

  async obterPowerBi(request: AuthenticatedRequest, response: Response) {
    const dashboard = await powerBiService.obterPowerBi(request.query, request.authUser);
    return response.json(dashboard);
  }

  async obterDetalhamentoPowerBi(request: AuthenticatedRequest, response: Response) {
    const detalhamentoId = String(request.params.id ?? "");
    const detalhamento = await powerBiService.obterDetalhamento(
      detalhamentoId,
      request.query,
      request.authUser
    );
    return response.json(detalhamento);
  }

  async obterVulnerabilidade(request: AuthenticatedRequest, response: Response) {
    const dashboard = await vulnerabilidadeService.obterMapa(request.authUser?.tenant_id);
    return response.json(dashboard);
  }

  async geocodificarVulnerabilidade(request: AuthenticatedRequest, response: Response) {
    const limite = typeof request.body?.limite === "number" ? request.body.limite : Number(request.body?.limite);
    const resultado = await vulnerabilidadeService.geocodificarPendentes(
      Number.isFinite(limite) ? limite : 15,
      request.authUser?.tenant_id
    );
    return response.json(resultado);
  }

  async listarOpcoesGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.listarOpcoesFiltros(request.authUser);
    return response.json(payload);
  }

  async consultarGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.consultar(request.body, request.authUser);
    return response.json(payload);
  }

  async obterDetalheGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.obterDetalheCompleto(
      String(request.params.id ?? ""),
      request.authUser
    );
    return response.json(payload);
  }

  async buscarVinculosGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.buscarVinculos(request.query, request.authUser);
    return response.json({ itens: payload });
  }

  async salvarMarcacaoGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.salvarMarcacao(request.body, request.authUser);
    return response.status(201).json(payload);
  }

  async geocodificarGeorreferenciamento(request: AuthenticatedRequest, response: Response) {
    const payload = await georreferenciamentoService.geocodificarPendentes(
      request.body,
      request.authUser
    );
    return response.json(payload);
  }
}
