import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ocorrenciasCriancaService } from "@/services/ocorrencias-crianca.service";
import type { OcorrenciaCriancaAnexoPayload, OcorrenciaCriancaPayload } from "@/types/ocorrencia-crianca";

export function useOcorrenciasCrianca() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["ocorrencias-crianca", tenantKey],
    queryFn: () => ocorrenciasCriancaService.listar(),
    enabled: !!usuario
  });
}

export function useOcorrenciaCrianca(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["ocorrencias-crianca", tenantKey, id],
    queryFn: () => ocorrenciasCriancaService.buscarPorId(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarOcorrenciaCrianca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: OcorrenciaCriancaPayload }) => {
      if (id) return ocorrenciasCriancaService.atualizar(id, payload);
      return ocorrenciasCriancaService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", tenantKey] });
      if (response.id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", tenantKey, response.id] });
      }
    }
  });
}

export function useRemoverOcorrenciaCrianca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (id: string) => ocorrenciasCriancaService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", tenantKey] });
    }
  });
}

export function useAnexosOcorrenciaCrianca(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useQuery({
    queryKey: ["ocorrencias-crianca", tenantKey, id, "anexos"],
    queryFn: () => ocorrenciasCriancaService.listarAnexos(id as string),
    enabled: !!usuario && !!id
  });
}

export function useAdicionarAnexoOcorrenciaCrianca(id?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (payload: OcorrenciaCriancaAnexoPayload) =>
      ocorrenciasCriancaService.adicionarAnexo(id as string, payload),
    onSuccess: async () => {
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", tenantKey, id, "anexos"] });
      }
    }
  });
}

export function useRemoverAnexoOcorrenciaCrianca(id?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (anexoId: string) => ocorrenciasCriancaService.removerAnexo(id as string, anexoId),
    onSuccess: async () => {
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["ocorrencias-crianca", tenantKey, id, "anexos"] });
      }
    }
  });
}
