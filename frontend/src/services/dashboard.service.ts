import { httpClient } from "./http-client";
import type { DashboardAssistenciaResponse, DashboardFiltros } from "@/types/dashboard";
import type { PowerBiFiltros, PowerBiResponse } from "@/types/power-bi";

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
      params: {
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
      }
    });

    return data;
  }
};
