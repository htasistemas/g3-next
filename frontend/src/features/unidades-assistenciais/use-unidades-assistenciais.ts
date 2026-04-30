import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { UnidadeAssistencial, UnidadeAssistencialFiltro } from "@/types/unidade-assistencial";

type ResumoQueryOptions = {
  enabled?: boolean;
};

export function useUnidadesAssistenciais(filtros: UnidadeAssistencialFiltro) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["unidades-assistenciais", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => unidadesAssistenciaisService.listar(filtros),
    enabled: !!usuario
  });
}

export function useUnidadeAssistencial(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["unidade-assistencial", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => unidadesAssistenciaisService.buscarPorId(id as string),
    enabled: !!usuario && !!id
  });
}

export function useUnidadeAssistencialAtual(options?: ResumoQueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["unidade-assistencial", "atual", tenantId],
    queryFn: () => unidadesAssistenciaisService.buscarAtual(),
    enabled: (options?.enabled ?? true) && !!usuario,
    staleTime: 300_000
  });
}

export function useSalvarUnidadeAssistencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UnidadeAssistencial) => {
      if (payload.id_unidade) {
        return unidadesAssistenciaisService.atualizar(payload.id_unidade, payload);
      }
      return unidadesAssistenciaisService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.unidade?.id_unidade;
      await queryClient.invalidateQueries({ queryKey: ["unidades-assistenciais"] });
      await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", "atual"] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", id] });
      }
    }
  });
}

export function useRemoverUnidadeAssistencial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unidadesAssistenciaisService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["unidades-assistenciais"] });
      await queryClient.invalidateQueries({ queryKey: ["unidade-assistencial", "atual"] });
    }
  });
}
