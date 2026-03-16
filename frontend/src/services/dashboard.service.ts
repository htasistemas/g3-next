import { httpClient } from "./http-client";
import type {
  DashboardAssistenciaResponse,
  DashboardFiltros,
  DashboardVulnerabilidadeGeocodingResponse,
  DashboardVulnerabilidadeResponse
} from "@/types/dashboard";
import type {
  GeoDetailResponse,
  GeoFilterOptionsResponse,
  GeoFilters,
  GeoLinkSearchItem,
  GeoManualPointInput,
  GeoManualPointResponse,
  GeoPendingGeocodingResponse,
  GeoQueryResponse
} from "@/types/georreferenciamento";
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
  },

  async obterOpcoesGeorreferenciamento(): Promise<GeoFilterOptionsResponse> {
    const { data } = await httpClient.get<GeoFilterOptionsResponse>("/api/dashboard/georreferenciamento/opcoes");
    return data;
  },

  async consultarGeorreferenciamento(filtros: GeoFilters): Promise<GeoQueryResponse> {
    const { data } = await httpClient.post<GeoQueryResponse>("/api/dashboard/georreferenciamento/consulta", filtros);
    return data;
  },

  async obterDetalheGeorreferenciamento(id: string): Promise<GeoDetailResponse> {
    const { data } = await httpClient.get<GeoDetailResponse>(
      `/api/dashboard/georreferenciamento/detalhe/${encodeURIComponent(id)}`
    );
    return data;
  },

  async buscarVinculosGeorreferenciamento(
    termo: string,
    tipos: string[]
  ): Promise<GeoLinkSearchItem[]> {
    const { data } = await httpClient.get<{ itens: GeoLinkSearchItem[] }>(
      "/api/dashboard/georreferenciamento/vinculos",
      {
        params: {
          termo,
          tipos
        }
      }
    );
    return data.itens;
  },

  async salvarMarcacaoGeorreferenciamento(
    input: GeoManualPointInput
  ): Promise<GeoManualPointResponse> {
    const { data } = await httpClient.post<GeoManualPointResponse>(
      "/api/dashboard/georreferenciamento/marcacoes",
      input
    );
    return data;
  },

  async geocodificarPendenciasGeorreferenciamento(
    limite = 20
  ): Promise<GeoPendingGeocodingResponse> {
    const { data } = await httpClient.post<GeoPendingGeocodingResponse>(
      "/api/dashboard/georreferenciamento/geocodificar-pendentes",
      { limite }
    );
    return data;
  }
};
