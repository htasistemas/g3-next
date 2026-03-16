import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { planoTrabalhoService } from "@/services/plano-trabalho.service";
import type { PlanoTrabalhoPayload } from "@/types/plano-trabalho";

type QueryOptions = {
  enabled?: boolean;
};

export function usePlanosTrabalho(options?: QueryOptions) {
  return useQuery({
    queryKey: ["planos-trabalho", "lista"],
    queryFn: () => planoTrabalhoService.listar(),
    enabled: options?.enabled ?? true
  });
}

export function useSalvarPlanoTrabalho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: PlanoTrabalhoPayload }) => {
      if (id) return planoTrabalhoService.atualizar(id, payload);
      return planoTrabalhoService.criar(payload);
    },
    onSuccess: async (plano) => {
      await queryClient.invalidateQueries({ queryKey: ["planos-trabalho", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["planos-trabalho", "item", plano.id] });
    }
  });
}

export function useExcluirPlanoTrabalho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planoTrabalhoService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["planos-trabalho", "lista"] });
    }
  });
}
