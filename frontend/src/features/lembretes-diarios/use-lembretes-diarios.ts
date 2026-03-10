import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lembretesDiariosService } from "@/services/lembretes-diarios.service";
import type { LembreteDiarioPayload } from "@/types/lembrete-diario";

export function useLembretesDiarios(usuarioId?: number) {
  return useQuery({
    queryKey: ["lembretes-diarios", usuarioId ?? "todos"],
    queryFn: () => lembretesDiariosService.listar(usuarioId)
  });
}

export function useSalvarLembreteDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: LembreteDiarioPayload }) => {
      if (id) return lembretesDiariosService.atualizar(id, payload);
      return lembretesDiariosService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lembretes-diarios"] });
    }
  });
}

export function useExcluirLembreteDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lembretesDiariosService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lembretes-diarios"] });
    }
  });
}

export function useConcluirLembreteDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => lembretesDiariosService.concluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lembretes-diarios"] });
    }
  });
}

export function useAdiarLembreteDiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, novaDataHora }: { id: number; novaDataHora: string }) =>
      lembretesDiariosService.adiar(id, novaDataHora),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lembretes-diarios"] });
    }
  });
}
