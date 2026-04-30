import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { doacoesRealizadasService } from "@/services/doacoes-realizadas.service";
import type { DoacaoRealizada, DoacaoRealizadaFiltro } from "@/types/doacao-realizada";

export function useDoacoesRealizadas(filtros: DoacaoRealizadaFiltro) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["doacoes-realizadas", tenantKey, filtros],
    queryFn: () => doacoesRealizadasService.listar(filtros),
    enabled: !!usuario
  });
}

export function useDoacaoRealizada(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["doacao-realizada", tenantKey, id],
    queryFn: () => doacoesRealizadasService.buscarPorId(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarDoacaoRealizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: async (payload: DoacaoRealizada) => {
      if (payload.id_doacao_realizada) {
        return doacoesRealizadasService.atualizar(payload.id_doacao_realizada, payload);
      }
      return doacoesRealizadasService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-realizadas", tenantKey] });
      const id = response.doacao?.id_doacao_realizada;
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["doacao-realizada", tenantKey, id] });
      }
    }
  });
}

export function useRemoverDoacaoRealizada() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (id: string) => doacoesRealizadasService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["doacoes-realizadas", tenantKey] });
    }
  });
}
