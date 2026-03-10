import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { termoFomentoService } from "@/services/termo-fomento.service";
import type { AditivoTermoFomento, TermoFomentoPayload } from "@/types/termo-fomento";

export function useTermosFomento() {
  return useQuery({
    queryKey: ["termos-fomento", "lista"],
    queryFn: () => termoFomentoService.listar()
  });
}

export function useSalvarTermoFomento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: TermoFomentoPayload }) => {
      if (id) return termoFomentoService.atualizar(id, payload);
      return termoFomentoService.criar(payload);
    },
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "item", termo.id] });
    }
  });
}

export function useExcluirTermoFomento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => termoFomentoService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "lista"] });
    }
  });
}

export function useAdicionarAditivoTermoFomento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ termoId, payload }: { termoId: string; payload: AditivoTermoFomento }) =>
      termoFomentoService.adicionarAditivo(termoId, payload),
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["termos-fomento", "item", termo.id] });
    }
  });
}
