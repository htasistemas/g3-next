import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import { documentosInstituicaoService } from "@/services/documentos-instituicao.service";
import type {
  DocumentoInstituicaoAnexoPayload,
  DocumentoInstituicaoHistoricoPayload,
  DocumentoInstituicaoPayload
} from "@/types/documentos-instituicao";

export function useDocumentosInstituicao() {
  return useQuery({
    queryKey: ["documentos-instituicao"],
    queryFn: () => documentosInstituicaoService.listar()
  });
}

export function useAnexosDocumentoInstituicao(documentoId?: string) {
  return useQuery({
    queryKey: ["documentos-instituicao", documentoId ?? "", "anexos"],
    queryFn: () => documentosInstituicaoService.listarAnexos(documentoId as string),
    enabled: !!documentoId
  });
}

export function useHistoricoDocumentoInstituicao(documentoId?: string) {
  return useQuery({
    queryKey: ["documentos-instituicao", documentoId ?? "", "historico"],
    queryFn: () => documentosInstituicaoService.listarHistorico(documentoId as string),
    enabled: !!documentoId
  });
}

export function useSalvarDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DocumentoInstituicaoPayload & { id?: string }) => {
      if (payload.id) return documentosInstituicaoService.atualizar(payload.id, payload);
      return documentosInstituicaoService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documentos-instituicao"] });
    }
  });
}

export function useExcluirDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentosInstituicaoService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documentos-instituicao"] });
    }
  });
}

export function useAdicionarAnexoDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      onUploadProgress
    }: {
      id: string;
      payload: DocumentoInstituicaoAnexoPayload;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }) => documentosInstituicaoService.adicionarAnexo(id, payload, { onUploadProgress }),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["documentos-instituicao"] });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "anexos"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "historico"]
      });
    }
  });
}

export function useSubstituirAnexoDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      anexoId,
      payload,
      onUploadProgress
    }: {
      id: string;
      anexoId: string;
      payload: DocumentoInstituicaoAnexoPayload;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }) => documentosInstituicaoService.substituirAnexo(id, anexoId, payload, { onUploadProgress }),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["documentos-instituicao"] });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "anexos"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "historico"]
      });
    }
  });
}

export function useExcluirAnexoDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, anexoId }: { id: string; anexoId: string }) =>
      documentosInstituicaoService.excluirAnexo(id, anexoId),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["documentos-instituicao"] });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "anexos"]
      });
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "historico"]
      });
    }
  });
}

export function useAdicionarHistoricoDocumentoInstituicao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: DocumentoInstituicaoHistoricoPayload;
    }) => documentosInstituicaoService.adicionarHistorico(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({
        queryKey: ["documentos-instituicao", vars.id, "historico"]
      });
    }
  });
}
