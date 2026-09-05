import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { projetosService } from "@/services/projetos.service";
import type { ProjetoFiltros, ProjetoIndicadorPayload, ProjetoPayload, ProjetoTarefaPayload, ProjetoTarefaStatus } from "@/types/projeto";

export function useProjetos(filtros: ProjetoFiltros, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => projetosService.listar(filtros),
    enabled,
    staleTime: 30_000
  });
}

export function useProjetosDashboard(filtros: ProjetoFiltros, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", "dashboard", filtros],
    queryFn: () => projetosService.dashboard(filtros),
    enabled,
    staleTime: 30_000
  });
}

export function useProjeto(id?: string, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", id ?? ""],
    queryFn: () => projetosService.buscarPorId(id as string),
    enabled: enabled && !!id
  });
}

export function useSalvarProjeto() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ProjetoPayload }) =>
      id ? projetosService.atualizar(id, payload) : projetosService.criar(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projetos", tenantKey] });
    }
  });
}

export function useInativarProjeto() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => projetosService.inativar(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projetos", tenantKey] });
    }
  });
}

export function useSalvarTarefaProjeto() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({
      projetoId,
      tarefaId,
      payload
    }: {
      projetoId: string;
      tarefaId?: string;
      payload: ProjetoTarefaPayload;
    }) =>
      tarefaId
        ? projetosService.atualizarTarefa(projetoId, tarefaId, payload)
        : projetosService.criarTarefa(projetoId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projetos", tenantKey] });
    }
  });
}

export function useMoverTarefaProjeto() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({
      projetoId,
      tarefaId,
      status
    }: {
      projetoId: string;
      tarefaId: string;
      status: ProjetoTarefaStatus;
    }) => projetosService.moverTarefa(projetoId, tarefaId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projetos", tenantKey] });
    }
  });
}

export function useHistoricoProjeto(id?: string, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", "historico", id ?? ""],
    queryFn: () => projetosService.historico(id as string),
    enabled: enabled && !!id,
    staleTime: 15_000
  });
}

export function useRelatorioProjeto() {
  return useMutation({
    mutationFn: ({ tipo, payload }: { tipo: string; payload: Record<string, unknown> }) =>
      projetosService.relatorioPdf(tipo, payload)
  });
}

export function useIndicadoresProjeto(id?: string, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", id ?? "", "indicadores"], queryFn: () => projetosService.listarIndicadores(id as string), enabled: enabled && !!id, staleTime: 15_000 });
}

export function useDashboardIndicadoresProjeto(params?: { projeto_id?: string; periodo_de?: string; periodo_ate?: string; unidade_id?: string }, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", "impacto-dashboard", params ?? {}], queryFn: () => projetosService.dashboardIndicadores(params), enabled, staleTime: 15_000 });
}

export function useSalvarIndicadorProjeto() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({ mutationFn: ({ projetoId, payload }: { projetoId: string; payload: ProjetoIndicadorPayload }) => projetosService.criarIndicador(projetoId, payload), onSuccess: async (_data, variables) => { await queryClient.invalidateQueries({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", variables.projetoId, "indicadores"] }); } });
}

export function useEvidenciasIndicadorProjeto(projetoId?: string, indicadorId?: number, enabled = true) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", projetoId ?? "", "indicador-evidencias", indicadorId ?? ""], queryFn: () => projetosService.listarEvidencias(projetoId as string, indicadorId as number), enabled: enabled && !!projetoId && !!indicadorId, staleTime: 15_000 });
}

export function useEnviarEvidenciaIndicador() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({ mutationFn: ({ projetoId, indicadorId, arquivo }: { projetoId: string; indicadorId: number; arquivo: File }) => projetosService.enviarEvidencia(projetoId, indicadorId, arquivo), onSuccess: async (_data, variables) => { await queryClient.invalidateQueries({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", variables.projetoId, "indicadores"] }); await queryClient.invalidateQueries({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", variables.projetoId, "indicador-evidencias", variables.indicadorId] }); } });
}

export function useRegistrarMedicaoIndicador() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  return useMutation({ mutationFn: ({ projetoId, indicadorId, payload }: { projetoId: string; indicadorId: number; payload: { competencia: string; valor: number; observacao?: string; evidencia_id?: number } }) => projetosService.registrarMedicao(projetoId, indicadorId, payload), onSuccess: async (_data, variables) => { await queryClient.invalidateQueries({ queryKey: ["projetos", usuario?.tenant_id ?? "sem-tenant", variables.projetoId, "indicadores"] }); } });
}

