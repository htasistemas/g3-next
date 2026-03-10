import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fotosEventosService } from "@/services/fotos-eventos.service";
import type { FotoEventoPayload } from "@/types/fotos-eventos";

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
  return useQuery({
    queryKey: ["fotos-eventos", filtros],
    queryFn: () => fotosEventosService.listar(filtros)
  });
}

export function useFotoEvento(id?: number) {
  return useQuery({
    queryKey: ["fotos-eventos", "detalhe", id ?? 0],
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
