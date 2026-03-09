import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doacoesRealizadasService } from "@/services/doacoes-realizadas.service";
import type { DoacaoRealizada, DoacaoRealizadaFiltro } from "@/types/doacao-realizada";

export function useDoacoesRealizadas(filtros: DoacaoRealizadaFiltro) {
  return useQuery({
    queryKey: ["doacoes-realizadas", filtros],
    queryFn: () => doacoesRealizadasService.listar(filtros)
  });
}

export function useDoacaoRealizada(id?: string) {
  return useQuery({
    queryKey: ["doacao-realizada", id],
    queryFn: () => doacoesRealizadasService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarDoacaoRealizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DoacaoRealizada) => {
      if (payload.id_doacao_realizada) {
        return doacoesRealizadasService.atualizar(payload.id_doacao_realizada, payload);
      }
      return doacoesRealizadasService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-realizadas"] });
      const id = response.doacao?.id_doacao_realizada;
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["doacao-realizada", id] });
      }
    }
  });
}

export function useRemoverDoacaoRealizada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => doacoesRealizadasService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-realizadas"] });
    }
  });
}
