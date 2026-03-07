import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { familiasService } from "@/services/familias.service";
import type { Familia, FamiliaFiltro } from "@/types/familia";

export function useFamilias(filtros: FamiliaFiltro) {
  return useQuery({
    queryKey: ["familias", filtros],
    queryFn: () => familiasService.listar(filtros)
  });
}

export function useFamilia(id?: string) {
  return useQuery({
    queryKey: ["familia", id],
    queryFn: () => familiasService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Familia) => {
      if (payload.id_familia) {
        return familiasService.atualizar(payload.id_familia, payload);
      }
      return familiasService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.familia.id_familia;
      await queryClient.invalidateQueries({ queryKey: ["familias"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["familia", id] });
      }
    }
  });
}

export function useRemoverMembroFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; membroId: string }) =>
      familiasService.removerMembro(payload.familiaId, payload.membroId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["familias"] });
      await queryClient.invalidateQueries({ queryKey: ["familia", variables.familiaId] });
    }
  });
}
