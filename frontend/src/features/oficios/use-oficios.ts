import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { oficiosService } from "@/services/oficios.service";
import type { OficioImagemPayload, OficioPayload, OficioPdfAssinadoPayload } from "@/types/oficio";

export function useOficios() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["oficios", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => oficiosService.listar()
  });
}

export function useOficio(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["oficios", usuario?.tenant_id ?? "sem-tenant", id ?? ""],
    queryFn: () => oficiosService.obter(id as string),
    enabled: !!id
  });
}

export function useProximoNumeroOficio(dataReferencia?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["oficios", "proximo-numero", usuario?.tenant_id ?? "sem-tenant", dataReferencia ?? ""],
    queryFn: () => oficiosService.obterProximoNumero(dataReferencia),
    staleTime: 30_000
  });
}

export function useContextoDocumentoOficio() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["oficios", "contexto-documento", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => oficiosService.obterContextoDocumento(),
    staleTime: 300_000
  });
}

export function useImportarConteudoOficio() {
  return useMutation({
    mutationFn: (arquivo: File) => oficiosService.importarConteudoArquivo(arquivo)
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
