import { httpClient } from "./http-client";
import type {
  DashboardAssistenciaResponse,
  DashboardFiltros,
  DashboardVulnerabilidadeGeocodingResponse,
  DashboardVulnerabilidadeResponse
} from "@/types/dashboard";
import type { PowerBiDetalheTabela, PowerBiFiltros, PowerBiResponse } from "@/types/power-bi";

function montarPowerBiParams(filtros: PowerBiFiltros = {}) {
  return {
    periodPreset: filtros.periodPreset,
    startDate: filtros.startDate,
    endDate: filtros.endDate,
    unidades: filtros.unidades,
    municipios: filtros.municipios,
    bairros: filtros.bairros,
    programas: filtros.programas,
    situacoesCadastro: filtros.situacoesCadastro,
    faixasEtarias: filtros.faixasEtarias,
    generos: filtros.generos,
    responsaveisTecnicos: filtros.responsaveisTecnicos,
    tiposAtendimento: filtros.tiposAtendimento,
    origensEncaminhamento: filtros.origensEncaminhamento,
    statusAcompanhamento: filtros.statusAcompanhamento,
    familiaBeneficiario: filtros.familiaBeneficiario,
    tecnicoUsuario: filtros.tecnicoUsuario
  };
}

export const dashboardService = {
  async obterAssistencia(filtros: DashboardFiltros = {}): Promise<DashboardAssistenciaResponse> {
    const params: DashboardFiltros = {};
    if (filtros.startDate) params.startDate = filtros.startDate;
    if (filtros.endDate) params.endDate = filtros.endDate;

    const { data } = await httpClient.get<DashboardAssistenciaResponse>("/api/dashboard/assistencia", {
      params
    });
    return data;
  },

  async obterPowerBi(filtros: PowerBiFiltros = {}): Promise<PowerBiResponse> {
    const { data } = await httpClient.get<PowerBiResponse>("/api/dashboard/power-bi", {
      params: montarPowerBiParams(filtros)
    });

    return data;
  },

  async obterPowerBiDetalhamento(
    detalhamentoId: string,
    filtros: PowerBiFiltros = {}
  ): Promise<PowerBiDetalheTabela> {
    const { data } = await httpClient.get<PowerBiDetalheTabela>(
      `/api/dashboard/power-bi/detalhamentos/${encodeURIComponent(detalhamentoId)}`,
      {
        params: montarPowerBiParams(filtros)
      }
    );

    return data;
  },

  async obterVulnerabilidade(): Promise<DashboardVulnerabilidadeResponse> {
    const { data } = await httpClient.get<DashboardVulnerabilidadeResponse>(
      "/api/dashboard/vulnerabilidade"
    );
    return data;
  },

  async geocodificarPendenciasVulnerabilidade(
    limite = 15
  ): Promise<DashboardVulnerabilidadeGeocodingResponse> {
    const { data } = await httpClient.post<DashboardVulnerabilidadeGeocodingResponse>(
      "/api/dashboard/vulnerabilidade/geocodificar-pendentes",
      { limite }
    );
    return data;
  }
};
