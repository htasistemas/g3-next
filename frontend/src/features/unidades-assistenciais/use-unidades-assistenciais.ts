import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { UnidadeAssistencial, UnidadeAssistencialFiltro } from "@/types/unidade-assistencial";

export function useUnidadesAssistenciais(filtros: UnidadeAssistencialFiltro) {
  return useQuery({
    queryKey: ["unidades-assistenciais", filtros],
    queryFn: () => unidadesAssistenciaisService.listar(filtros)
  });
}

export function useUnidadeAssistencial(id?: string) {
  return useQuery({
    queryKey: ["unidade-assistencial", id],
    queryFn: () => unidadesAssistenciaisService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useUnidadeAssistencialAtual() {
  return useQuery({
    queryKey: ["unidade-assistencial", "atual"],
    queryFn: () => unidadesAssistenciaisService.buscarAtual()
  });
}

export function useSalvarUnidadeAssistencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UnidadeAssistencial) => {
      if (payload.id_unidade) {
        return unidadesAssistenciaisService.atualizar(payload.id_unidade, payload);
      }
      return unidadesAssistenciaisService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.unidade?.id_unidade;
      await queryClient.invalidateQueries({ queryKey: ["unidades-assistenciais"] });
      await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", "atual"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", id] });
      }
    }
  });
}

export function useRemoverUnidadeAssistencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unidadesAssistenciaisService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["unidades-assistenciais"] });
      await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", "atual"] });
    }
  });
}
