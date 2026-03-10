import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ocorrenciasCriancaService } from "@/services/ocorrencias-crianca.service";
import type { OcorrenciaCriancaAnexoPayload, OcorrenciaCriancaPayload } from "@/types/ocorrencia-crianca";

export function useOcorrenciasCrianca() {
  return useQuery({
    queryKey: ["ocorrencias-crianca"],
    queryFn: () => ocorrenciasCriancaService.listar()
  });
}

export function useOcorrenciaCrianca(id?: string) {
  return useQuery({
    queryKey: ["ocorrencias-crianca", id],
    queryFn: () => ocorrenciasCriancaService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarOcorrenciaCrianca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: OcorrenciaCriancaPayload }) => {
      if (id) return ocorrenciasCriancaService.atualizar(id, payload);
      return ocorrenciasCriancaService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca"] });
      if (response.id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", response.id] });
      }
    }
  });
}

export function useRemoverOcorrenciaCrianca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ocorrenciasCriancaService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca"] });
    }
  });
}

export function useAnexosOcorrenciaCrianca(id?: string) {
  return useQuery({
    queryKey: ["ocorrencias-crianca", id, "anexos"],
    queryFn: () => ocorrenciasCriancaService.listarAnexos(id as string),
    enabled: !!id
  });
}

export function useAdicionarAnexoOcorrenciaCrianca(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OcorrenciaCriancaAnexoPayload) =>
      ocorrenciasCriancaService.adicionarAnexo(id as string, payload),
    onSuccess: async () => {
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", id, "anexos"] });
      }
    }
  });
}

export function useRemoverAnexoOcorrenciaCrianca(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (anexoId: string) => ocorrenciasCriancaService.removerAnexo(id as string, anexoId),
    onSuccess: async () => {
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", id, "anexos"] });
      }
    }
  });
}

