import { httpClient } from "./http-client";
import type { FotoEvento, FotoEventoItem, FotoEventoPayload } from "@/types/fotos-eventos";

export const fotosEventosService = {
  async listar(params?: {
    busca?: string;
    dataInicio?: string;
    dataFim?: string;
    unidadeId?: number;
    status?: string;
    tags?: string;
    ordenacao?: string;
    pagina?: number;
    tamanho?: number;
  }) {
    const { data } = await httpClient.get<{
      eventos: FotoEvento[];
      pagina: number;
      tamanho: number;
      total: number;
      totalPaginas: number;
    }>("/api/fotos-eventos", { params });
    return data;
  },

  async obter(id: number) {
    const { data } = await httpClient.get<{ evento: FotoEvento; fotos: FotoEventoItem[] }>(
      `/api/fotos-eventos/${id}`
    );
    return data;
  },

  async criar(payload: FotoEventoPayload) {
    const { data } = await httpClient.post<FotoEvento>("/api/fotos-eventos", payload);
    return data;
  },

  async atualizar(id: number, payload: FotoEventoPayload) {
    const { data } = await httpClient.put<FotoEvento>(`/api/fotos-eventos/${id}`, payload);
    return data;
  },

  async excluir(id: number) {
    await httpClient.delete(`/api/fotos-eventos/${id}`);
  },

  async adicionarFoto(
    id: number,
    payload: {
      arquivo: { nomeArquivo: string; contentType: string; conteudo: string };
      legenda?: string;
      creditos?: string;
      tags?: string[];
      ordem?: number | null;
    }
  ) {
    const { data } = await httpClient.post<FotoEventoItem>(`/api/fotos-eventos/${id}/fotos`, payload);
    return data;
  },

  async atualizarFoto(
    id: number,
    fotoId: number,
    payload: { legenda?: string; creditos?: string; tags?: string[]; ordem?: number | null }
  ) {
    const { data } = await httpClient.put<FotoEventoItem>(
      `/api/fotos-eventos/${id}/fotos/${fotoId}`,
      payload
    );
    return data;
  },

  async removerFoto(id: number, fotoId: number) {
    await httpClient.delete(`/api/fotos-eventos/${id}/fotos/${fotoId}`);
  }
};
