import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { rhContratacaoService } from "@/services/rh-contratacao.service";
import type {
  RhArquivoPayload,
  RhCandidatoPayload,
  RhDocumentoPayload,
  RhEntrevistaPayload,
  RhFichaPayload,
  RhTermoPayload
} from "@/types/rh-contratacao";

export function useCandidatosRh(termo: string) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "candidatos", termo],
    queryFn: () => rhContratacaoService.listarCandidatos(termo)
  });
}

export function useCandidatoRh(candidatoId?: number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "candidato", candidatoId],
    queryFn: () => rhContratacaoService.buscarCandidato(candidatoId as number),
    enabled: !!candidatoId
  });
}

export function useProcessoRh(candidatoId?: number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "processo", candidatoId],
    queryFn: () => rhContratacaoService.buscarProcessoPorCandidato(candidatoId as number),
    enabled: !!candidatoId
  });
}

export function useEntrevistasRh(processoId?: number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "entrevistas", processoId],
    queryFn: () => rhContratacaoService.listarEntrevistas(processoId as number),
    enabled: !!processoId
  });
}

export function useDocumentosRh(processoId?: number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "documentos", processoId],
    queryFn: () => rhContratacaoService.listarDocumentos(processoId as number),
    enabled: !!processoId
  });
}

export function useAuditoriaRh(processoId?: number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["rh-contratacao", tenantId, "auditoria", processoId],
    queryFn: () => rhContratacaoService.listarAuditoria(processoId as number),
    enabled: !!processoId
  });
}

export function useSalvarCandidatoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: RhCandidatoPayload }) => {
      if (id) return rhContratacaoService.atualizarCandidato(id, payload);
      return rhContratacaoService.criarCandidato(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "candidatos"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "candidato"] });
    }
  });
}

export function useInativarCandidatoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: number) => rhContratacaoService.inativarCandidato(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "candidatos"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "candidato"] });
    }
  });
}

export function useAtualizarStatusProcessoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, status }: { processoId: number; status: string }) =>
      rhContratacaoService.atualizarStatus(processoId, status),
    onSuccess: async (processo) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "processo", processo.candidatoId]
      });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "candidatos"] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", processo.id]
      });
    }
  });
}

export function useSalvarEntrevistaRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhEntrevistaPayload }) =>
      rhContratacaoService.salvarEntrevista(processoId, payload),
    onSuccess: async (entrevista) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "entrevistas", entrevista.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", entrevista.processoId]
      });
    }
  });
}

export function useSalvarFichaRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhFichaPayload }) =>
      rhContratacaoService.salvarFicha(processoId, payload),
    onSuccess: async (ficha) => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "ficha", ficha.processoId] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", ficha.processoId]
      });
    }
  });
}

export function useAtualizarDocumentoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({
      processoId,
      documentoId,
      payload
    }: {
      processoId: number;
      documentoId: number;
      payload: RhDocumentoPayload;
    }) => rhContratacaoService.atualizarDocumento(documentoId, payload),
    onSuccess: async (_documento, vars) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "documentos", vars.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", vars.processoId]
      });
    }
  });
}

export function useAdicionarArquivoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhArquivoPayload }) =>
      rhContratacaoService.adicionarArquivo(processoId, payload),
    onSuccess: async (arquivo) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "arquivos", arquivo.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", arquivo.processoId]
      });
    }
  });
}

export function useSalvarTermoRh() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhTermoPayload }) =>
      rhContratacaoService.salvarTermo(processoId, payload),
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", tenantId, "termos", termo.processoId] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", tenantId, "auditoria", termo.processoId]
      });
    }
  });
}
