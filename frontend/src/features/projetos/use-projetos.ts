import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { projetosService } from "@/services/projetos.service";
import type { ProjetoFiltros, ProjetoPayload, ProjetoTarefaPayload, ProjetoTarefaStatus } from "@/types/projeto";

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

