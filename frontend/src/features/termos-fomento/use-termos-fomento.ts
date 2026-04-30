import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { termoFomentoService } from "@/services/termo-fomento.service";
import type { AditivoTermoFomento, TermoFomentoPayload } from "@/types/termo-fomento";

export function useTermosFomento() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["termos-fomento", "lista", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => termoFomentoService.listar()
  });
}

export function useSalvarTermoFomento() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: TermoFomentoPayload }) => {
      if (id) return termoFomentoService.atualizar(id, payload);
      return termoFomentoService.criar(payload);
    },
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "lista"] });
      await queryClient.invalidateQueries({
        queryKey: ["termos-fomento", "item", usuario?.tenant_id ?? "sem-tenant", termo.id]
      });
    }
  });
}

export function useExcluirTermoFomento() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => termoFomentoService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["termos-fomento", "lista", usuario?.tenant_id ?? "sem-tenant"]
      });
    }
  });
}

export function useAdicionarAditivoTermoFomento() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ termoId, payload }: { termoId: string; payload: AditivoTermoFomento }) =>
      termoFomentoService.adicionarAditivo(termoId, payload),
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "lista"] });
      await queryClient.invalidateQueries({
        queryKey: ["termos-fomento", "item", usuario?.tenant_id ?? "sem-tenant", termo.id]
      });
    }
  });
}
