import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { fotosEventosService } from "@/services/fotos-eventos.service";
import type { FotoEventoFotosLotePayload, FotoEventoPayload } from "@/types/fotos-eventos";
import type { AxiosProgressEvent } from "axios";

type FiltrosFotoEvento = {
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  unidadeId?: number;
  status?: string;
  tags?: string;
  ordenacao?: string;
  pagina?: number;
  tamanho?: number;
};

export function useFotosEventos(filtros: FiltrosFotoEvento) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["fotos-eventos", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => fotosEventosService.listar(filtros)
  });
}

export function useFotoEvento(id?: number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["fotos-eventos", "detalhe", usuario?.tenant_id ?? "sem-tenant", id ?? 0],
    queryFn: () => fotosEventosService.obter(id as number),
    enabled: !!id
  });
}

export function useSalvarFotoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FotoEventoPayload & { id?: number }) => {
      if (payload.id) return fotosEventosService.atualizar(payload.id, payload);
      return fotosEventosService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
    }
  });
}

export function useRemoverFotoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fotosEventosService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
    }
  });
}

export function useAdicionarFotoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: number;
      payload: {
        arquivo: { nomeArquivo: string; contentType: string; conteudo: string };
        legenda?: string;
        creditos?: string;
        tags?: string[];
        ordem?: number | null;
      };
    }) => fotosEventosService.adicionarFoto(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos", "detalhe", vars.id] });
    }
  });
}

export function useAdicionarFotosEventoLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      onUploadProgress
    }: {
      id: number;
      payload: FotoEventoFotosLotePayload;
      onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
    }) => fotosEventosService.adicionarFotosLote(id, payload, { onUploadProgress }),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos", "detalhe", vars.id] });
    }
  });
}

export function useDefinirCapaEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fotoId }: { id: number; fotoId: number }) =>
      fotosEventosService.definirCapa(id, fotoId),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos", "detalhe", vars.id] });
    }
  });
}

export function useReordenarFotosEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fotoIds }: { id: number; fotoIds: number[] }) =>
      fotosEventosService.reordenarFotos(id, fotoIds),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos", "detalhe", vars.id] });
    }
  });
}

export function useRemoverFotoItemEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fotoId }: { id: number; fotoId: number }) =>
      fotosEventosService.removerFoto(id, fotoId),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["fotos-eventos", "detalhe", vars.id] });
    }
  });
}
