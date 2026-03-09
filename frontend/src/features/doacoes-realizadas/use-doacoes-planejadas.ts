import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doacoesPlanejadasService } from "@/services/doacoes-planejadas.service";
import type { DoacaoPlanejada, DoacaoPlanejadaFiltro } from "@/types/doacao-planejada";

export function useDoacoesPlanejadas(filtros: DoacaoPlanejadaFiltro) {
  return useQuery({
    queryKey: ["doacoes-planejadas", filtros],
    queryFn: () => doacoesPlanejadasService.listar(filtros)
  });
}

export function useSalvarDoacaoPlanejada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DoacaoPlanejada) => {
      if (payload.id_doacao_planejada) {
        return doacoesPlanejadasService.atualizar(payload.id_doacao_planejada, payload);
      }
      return doacoesPlanejadasService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-planejadas"] });
    }
  });
}

export function useRemoverDoacaoPlanejada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => doacoesPlanejadasService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-planejadas"] });
    }
  });
}

