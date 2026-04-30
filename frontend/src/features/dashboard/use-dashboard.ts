import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  const { usuario } = useAuth();
  const refreshIntervalMs = options.refreshIntervalMs ?? 30000;
  return useQuery({
    queryKey: ["dashboard", "assistencia", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => dashboardService.obterAssistencia(filtros),
    enabled: !!usuario,
    staleTime: 15000,
    refetchInterval: options.autoRefresh ? refreshIntervalMs : false
  });
}

export function useDashboardPowerBi(
  filtros: PowerBiFiltros = {},
  options: UseDashboardOptions = {}
) {
  const { usuario } = useAuth();
  const refreshIntervalMs = options.refreshIntervalMs ?? 120_000;
  return useQuery({
    queryKey: ["dashboard", "power-bi", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => dashboardService.obterPowerBi(filtros),
    enabled: !!usuario,
    staleTime: 60_000,
    refetchInterval: options.autoRefresh ? refreshIntervalMs : false
  });
}

export function useDashboardPowerBiDetalhamento(
  detalhamentoId: string | null,
  filtros: PowerBiFiltros = {},
  options: { enabled?: boolean } = {}
) {
  const { usuario } = useAuth();
  return useQuery<PowerBiDetalheTabela>({
    queryKey: [
      "dashboard",
      "power-bi",
      "detalhamento",
      usuario?.tenant_id ?? "sem-tenant",
      detalhamentoId,
      filtros
    ],
    queryFn: () => dashboardService.obterPowerBiDetalhamento(String(detalhamentoId), filtros),
    enabled: (options.enabled ?? true) && !!usuario && Boolean(detalhamentoId),
    staleTime: 120_000
  });
}

export function useDashboardVulnerabilidade(options: UseDashboardOptions = {}) {
  const { usuario } = useAuth();
  const refreshIntervalMs = options.refreshIntervalMs ?? 120_000;
  return useQuery({
    queryKey: ["dashboard", "vulnerabilidade", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => dashboardService.obterVulnerabilidade(),
    enabled: !!usuario,
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
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "opcoes", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => dashboardService.obterOpcoesGeorreferenciamento(),
    enabled: !!usuario,
    staleTime: 300_000
  });
}

export function useConsultaGeorreferenciamento(
  filtros: GeoFilters,
  options: { enabled?: boolean; refreshIntervalMs?: number } = {}
) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "dashboard",
      "georreferenciamento",
      "consulta",
      usuario?.tenant_id ?? "sem-tenant",
      filtros
    ],
    queryFn: () => dashboardService.consultarGeorreferenciamento(filtros),
    enabled: (options.enabled ?? true) && !!usuario,
    staleTime: 20_000,
    refetchInterval: options.refreshIntervalMs ?? false
  });
}

export function useDetalheGeorreferenciamento(id: string | null) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "georreferenciamento", "detalhe", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => dashboardService.obterDetalheGeorreferenciamento(String(id)),
    enabled: !!usuario && Boolean(id),
    staleTime: 30_000
  });
}

export function useBuscarVinculosGeorreferenciamento(termo: string, tipos: string[], enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: [
      "dashboard",
      "georreferenciamento",
      "vinculos",
      usuario?.tenant_id ?? "sem-tenant",
      termo,
      tipos
    ],
    queryFn: () => dashboardService.buscarVinculosGeorreferenciamento(termo, tipos),
    enabled: !!usuario && enabled && termo.trim().length >= 2,
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
