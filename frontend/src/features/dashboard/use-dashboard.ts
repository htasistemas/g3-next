import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardFiltros } from "@/types/dashboard";

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
