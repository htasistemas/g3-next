import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { planoTrabalhoService } from "@/services/plano-trabalho.service";
import type { PlanoTrabalhoPayload } from "@/types/plano-trabalho";

type QueryOptions = {
  enabled?: boolean;
};

export function usePlanosTrabalho(options?: QueryOptions) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["planos-trabalho", "lista", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => planoTrabalhoService.listar(),
    enabled: options?.enabled ?? true
  });
}

export function useSalvarPlanoTrabalho() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: PlanoTrabalhoPayload }) => {
      if (id) return planoTrabalhoService.atualizar(id, payload);
      return planoTrabalhoService.criar(payload);
    },
    onSuccess: async (plano) => {
      await queryClient.invalidateQueries({ queryKey: ["planos-trabalho", "lista"] });
      await queryClient.invalidateQueries({
        queryKey: ["planos-trabalho", "item", usuario?.tenant_id ?? "sem-tenant", plano.id]
      });
    }
  });
}

export function useExcluirPlanoTrabalho() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planoTrabalhoService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["planos-trabalho", "lista", usuario?.tenant_id ?? "sem-tenant"]
      });
    }
  });
}
