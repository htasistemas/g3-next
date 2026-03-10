import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { visitasDomiciliaresService } from "@/services/visitas-domiciliares.service";
import type { VisitaDomiciliar } from "@/types/visita-domiciliar";

export function useVisitasDomiciliares() {
  return useQuery({
    queryKey: ["visitas-domiciliares"],
    queryFn: () => visitasDomiciliaresService.listar()
  });
}

export function useSalvarVisitaDomiciliar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VisitaDomiciliar) => {
      if (payload.id && payload.id > 0) {
        return visitasDomiciliaresService.atualizar(payload.id, payload);
      }
      return visitasDomiciliaresService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["visitas-domiciliares"] });
    }
  });
}

export function useRemoverVisitaDomiciliar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => visitasDomiciliaresService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["visitas-domiciliares"] });
    }
  });
}

