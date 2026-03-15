import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["rh-contratacao", "candidatos", termo],
    queryFn: () => rhContratacaoService.listarCandidatos(termo)
  });
}

export function useCandidatoRh(candidatoId?: number) {
  return useQuery({
    queryKey: ["rh-contratacao", "candidato", candidatoId],
    queryFn: () => rhContratacaoService.buscarCandidato(candidatoId as number),
    enabled: !!candidatoId
  });
}

export function useProcessoRh(candidatoId?: number) {
  return useQuery({
    queryKey: ["rh-contratacao", "processo", candidatoId],
    queryFn: () => rhContratacaoService.buscarProcessoPorCandidato(candidatoId as number),
    enabled: !!candidatoId
  });
}

export function useEntrevistasRh(processoId?: number) {
  return useQuery({
    queryKey: ["rh-contratacao", "entrevistas", processoId],
    queryFn: () => rhContratacaoService.listarEntrevistas(processoId as number),
    enabled: !!processoId
  });
}

export function useDocumentosRh(processoId?: number) {
  return useQuery({
    queryKey: ["rh-contratacao", "documentos", processoId],
    queryFn: () => rhContratacaoService.listarDocumentos(processoId as number),
    enabled: !!processoId
  });
}

export function useAuditoriaRh(processoId?: number) {
  return useQuery({
    queryKey: ["rh-contratacao", "auditoria", processoId],
    queryFn: () => rhContratacaoService.listarAuditoria(processoId as number),
    enabled: !!processoId
  });
}

export function useSalvarCandidatoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: RhCandidatoPayload }) => {
      if (id) return rhContratacaoService.atualizarCandidato(id, payload);
      return rhContratacaoService.criarCandidato(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "candidatos"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "candidato"] });
    }
  });
}

export function useInativarCandidatoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rhContratacaoService.inativarCandidato(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "candidatos"] });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "candidato"] });
    }
  });
}

export function useAtualizarStatusProcessoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, status }: { processoId: number; status: string }) =>
      rhContratacaoService.atualizarStatus(processoId, status),
    onSuccess: async (processo) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "processo", processo.candidatoId]
      });
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "candidatos"] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", processo.id]
      });
    }
  });
}

export function useSalvarEntrevistaRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhEntrevistaPayload }) =>
      rhContratacaoService.salvarEntrevista(processoId, payload),
    onSuccess: async (entrevista) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "entrevistas", entrevista.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", entrevista.processoId]
      });
    }
  });
}

export function useSalvarFichaRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhFichaPayload }) =>
      rhContratacaoService.salvarFicha(processoId, payload),
    onSuccess: async (ficha) => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "ficha", ficha.processoId] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", ficha.processoId]
      });
    }
  });
}

export function useAtualizarDocumentoRh() {
  const queryClient = useQueryClient();
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
        queryKey: ["rh-contratacao", "documentos", vars.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", vars.processoId]
      });
    }
  });
}

export function useAdicionarArquivoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhArquivoPayload }) =>
      rhContratacaoService.adicionarArquivo(processoId, payload),
    onSuccess: async (arquivo) => {
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "arquivos", arquivo.processoId]
      });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", arquivo.processoId]
      });
    }
  });
}

export function useSalvarTermoRh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ processoId, payload }: { processoId: number; payload: RhTermoPayload }) =>
      rhContratacaoService.salvarTermo(processoId, payload),
    onSuccess: async (termo) => {
      await queryClient.invalidateQueries({ queryKey: ["rh-contratacao", "termos", termo.processoId] });
      await queryClient.invalidateQueries({
        queryKey: ["rh-contratacao", "auditoria", termo.processoId]
      });
    }
  });
}
