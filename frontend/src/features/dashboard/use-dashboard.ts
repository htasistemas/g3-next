import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardFiltros } from "@/types/dashboard";
import type { PowerBiFiltros } from "@/types/power-bi";

type UseDashboardOptions = {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
};

export function useDashboardAssistencia(
  filtros: DashboardFiltros = {},
  options: UseDashboardOptions = {}
) {
  const refreshIntervalMs = options.refreshIntervalMs ?? 30000;
  return useQuery({
    queryKey: ["dashboard", "assistencia", filtros],
    queryFn: () => dashboardService.obterAssistencia(filtros),
    staleTime: 15000,
    refetchInterval: options.autoRefresh ? refreshIntervalMs : false
  });
}

export function useDashboardPowerBi(
  filtros: PowerBiFiltros = {},
  options: UseDashboardOptions = {}
) {
  const refreshIntervalMs = options.refreshIntervalMs ?? 120_000;
  return useQuery({
    queryKey: ["dashboard", "power-bi", filtros],
    queryFn: () => dashboardService.obterPowerBi(filtros),
    staleTime: 60_000,
    refetchInterval: options.autoRefresh ? refreshIntervalMs : false
  });
}
