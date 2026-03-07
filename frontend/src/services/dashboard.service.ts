import { httpClient } from "./http-client";
import type { DashboardAssistenciaResponse, DashboardFiltros } from "@/types/dashboard";

export const dashboardService = {
  async obterAssistencia(filtros: DashboardFiltros = {}): Promise<DashboardAssistenciaResponse> {
    const params: DashboardFiltros = {};
    if (filtros.startDate) params.startDate = filtros.startDate;
    if (filtros.endDate) params.endDate = filtros.endDate;

    const { data } = await httpClient.get<DashboardAssistenciaResponse>("/api/dashboard/assistencia", {
      params
    });
    return data;
  }
};
