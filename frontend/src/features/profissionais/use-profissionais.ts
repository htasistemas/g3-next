import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { profissionaisService } from "@/services/profissionais.service";
import type { Profissional, ProfissionalFiltro } from "@/types/profissional";

export function useProfissionais(filtros: ProfissionalFiltro) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["profissionais", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => profissionaisService.listar(filtros)
  });
}

export function useProfissional(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["profissional", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => profissionaisService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarProfissional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Profissional) => {
      if (payload.id_profissional) {
        return profissionaisService.atualizar(payload.id_profissional, payload);
      }
      return profissionaisService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.profissional?.id_profissional;
      await queryClient.invalidateQueries({ queryKey: ["profissionais"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["profissional", id] });
      }
    }
  });
}

export function useRemoverProfissional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => profissionaisService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profissionais"] });
    }
  });
}
