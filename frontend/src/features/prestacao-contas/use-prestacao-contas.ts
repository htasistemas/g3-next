import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { prestacaoContasService } from "@/services/prestacao-contas.service";
import type { PrestacaoContasPayload } from "@/types/prestacao-contas";

export function usePrestacoesContas() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "lista"],
    queryFn: () => prestacaoContasService.listar()
  });
}

export function useSalvarPrestacaoContas() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: PrestacaoContasPayload }) => {
      if (id) return prestacaoContasService.atualizar(id, payload);
      return prestacaoContasService.criar(payload);
    },
    onSuccess: async (registro) => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "item", registro.id] });
    }
  });
}

export function useExcluirPrestacaoContas() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => prestacaoContasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "lista"] });
    }
  });
}
