import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tarefasAdministrativasService } from "@/services/tarefas-administrativas.service";
import type { TarefaAdministrativaPayload } from "@/types/tarefa-administrativa";

type ResumoQueryOptions = {
  enabled?: boolean;
};

export function useTarefasAdministrativas(options?: ResumoQueryOptions) {
  return useQuery({
    queryKey: ["tarefas-administrativas"],
    queryFn: () => tarefasAdministrativasService.listar(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000
  });
}

export function useResumoTarefasAdministrativas(options?: ResumoQueryOptions) {
  return useQuery({
    queryKey: ["tarefas-administrativas", "resumo"],
    queryFn: () => tarefasAdministrativasService.obterResumo(),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    refetchInterval: options?.enabled ?? true ? 60_000 : false
  });
}

export function useTarefaAdministrativa(id?: string) {
  return useQuery({
    queryKey: ["tarefas-administrativas", id ?? ""],
    queryFn: () => tarefasAdministrativasService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarTarefaAdministrativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TarefaAdministrativaPayload & { id?: string }) => {
      if (payload.id) return tarefasAdministrativasService.atualizar(payload.id, payload);
      return tarefasAdministrativasService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tarefas-administrativas"] });
    }
  });
}

export function useExcluirTarefaAdministrativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tarefasAdministrativasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tarefas-administrativas"] });
    }
  });
}

export function useAdicionarHistoricoTarefaAdministrativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mensagem }: { id: string; mensagem: string }) =>
      tarefasAdministrativasService.adicionarHistorico(id, mensagem),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["tarefas-administrativas"] });
      await queryClient.invalidateQueries({ queryKey: ["tarefas-administrativas", vars.id] });
    }
  });
}
