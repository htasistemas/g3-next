import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { oficiosService } from "@/services/oficios.service";
import type { OficioImagemPayload, OficioPayload, OficioPdfAssinadoPayload } from "@/types/oficio";

export function useOficios() {
  return useQuery({
    queryKey: ["oficios"],
    queryFn: () => oficiosService.listar()
  });
}

export function useOficio(id?: string) {
  return useQuery({
    queryKey: ["oficios", id ?? ""],
    queryFn: () => oficiosService.obter(id as string),
    enabled: !!id
  });
}

export function useSalvarOficio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OficioPayload) => {
      if (payload.id) return oficiosService.atualizar(payload.id, payload);
      return oficiosService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["oficios"] });
    }
  });
}

export function useExcluirOficio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => oficiosService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["oficios"] });
    }
  });
}

export function useSalvarPdfAssinadoOficio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OficioPdfAssinadoPayload }) =>
      oficiosService.salvarPdfAssinado(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["oficios"] });
      await queryClient.invalidateQueries({ queryKey: ["oficios", vars.id] });
    }
  });
}

export function useAdicionarImagemOficio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OficioImagemPayload }) =>
      oficiosService.adicionarImagem(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["oficios", vars.id] });
      await queryClient.invalidateQueries({ queryKey: ["oficios"] });
    }
  });
}
