import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { prestacaoContasService } from "@/services/prestacao-contas.service";
import type { PrestacaoContasPayload } from "@/types/prestacao-contas";

export function usePrestacoesContas() {
  return useQuery({
    queryKey: ["prestacao-contas", "lista"],
    queryFn: () => prestacaoContasService.listar()
  });
}

export function useSalvarPrestacaoContas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: PrestacaoContasPayload }) => {
      if (id) return prestacaoContasService.atualizar(id, payload);
      return prestacaoContasService.criar(payload);
    },
    onSuccess: async (registro) => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", "item", registro.id] });
    }
  });
}

export function useExcluirPrestacaoContas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prestacaoContasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", "lista"] });
    }
  });
}
