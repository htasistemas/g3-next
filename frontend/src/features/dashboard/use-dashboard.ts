import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardFiltros } from "@/types/dashboard";
import type { GeoFilters } from "@/types/georreferenciamento";
import type { PowerBiDetalheTabela, PowerBiFiltros } from "@/types/power-bi";

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

export function useDashboardPowerBiDetalhamento(
  detalhamentoId: string | null,
  filtros: PowerBiFiltros = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery<PowerBiDetalheTabela>({
    queryKey: ["dashboard", "power-bi", "detalhamento", detalhamentoId, filtros],
    queryFn: () => dashboardService.obterPowerBiDetalhamento(String(detalhamentoId), filtros),
    enabled: (options.enabled ?? true) && Boolean(detalhamentoId),
    staleTime: 120_000
  });
}

export function useDashboardVulnerabilidade(options: UseDashboardOptions = {}) {
  const refreshIntervalMs = options.refreshIntervalMs ?? 120_000;
  return useQuery({
    queryKey: ["dashboard", "vulnerabilidade"],
    queryFn: () => dashboardService.obterVulnerabilidade(),
    staleTime: 60_000,
    refetchInterval: options.autoRefresh ? refreshIntervalMs : false
  });
}

export function useGeocodificarPendenciasVulnerabilidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limite?: number) => dashboardService.geocodificarPendenciasVulnerabilidade(limite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "vulnerabilidade"] });
    }
  });
}

export function useOpcoesGeorreferenciamento() {
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "opcoes"],
    queryFn: () => dashboardService.obterOpcoesGeorreferenciamento(),
    staleTime: 300_000
  });
}

export function useConsultaGeorreferenciamento(
  filtros: GeoFilters,
  options: { enabled?: boolean; refreshIntervalMs?: number } = {}
) {
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "consulta", filtros],
    queryFn: () => dashboardService.consultarGeorreferenciamento(filtros),
    enabled: options.enabled ?? true,
    staleTime: 20_000,
    refetchInterval: options.refreshIntervalMs ?? false
  });
}

export function useDetalheGeorreferenciamento(id: string | null) {
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "detalhe", id],
    queryFn: () => dashboardService.obterDetalheGeorreferenciamento(String(id)),
    enabled: Boolean(id),
    staleTime: 30_000
  });
}

export function useBuscarVinculosGeorreferenciamento(termo: string, tipos: string[], enabled = true) {
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "vinculos", termo, tipos],
    queryFn: () => dashboardService.buscarVinculosGeorreferenciamento(termo, tipos),
    enabled: enabled && termo.trim().length >= 2,
    staleTime: 30_000
  });
}

export function useSalvarMarcacaoGeorreferenciamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dashboardService.salvarMarcacaoGeorreferenciamento,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "georreferenciamento"] });
    }
  });
}

export function useGeocodificarPendenciasGeorreferenciamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limite?: number) => dashboardService.geocodificarPendenciasGeorreferenciamento(limite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "georreferenciamento"] });
    }
  });
}
