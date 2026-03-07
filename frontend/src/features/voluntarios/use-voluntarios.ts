import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { voluntariosService } from "@/services/voluntarios.service";
import type { Voluntario, VoluntarioFiltro } from "@/types/voluntario";

export function useVoluntarios(filtros: VoluntarioFiltro) {
  return useQuery({
    queryKey: ["voluntarios", filtros],
    queryFn: () => voluntariosService.listar(filtros)
  });
}

export function useVoluntario(id?: string) {
  return useQuery({
    queryKey: ["voluntario", id],
    queryFn: () => voluntariosService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarVoluntario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Voluntario) => {
      if (payload.id_voluntario) {
        return voluntariosService.atualizar(payload.id_voluntario, payload);
      }
      return voluntariosService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.voluntario?.id_voluntario;
      await queryClient.invalidateQueries({ queryKey: ["voluntarios"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["voluntario", id] });
      }
    }
  });
}

export function useRemoverVoluntario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => voluntariosService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voluntarios"] });
    }
  });
}
