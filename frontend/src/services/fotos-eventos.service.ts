import { httpClient } from "./http-client";
import type { AxiosProgressEvent } from "axios";
import type {
  FotoEvento,
  FotoEventoFotosLotePayload,
  FotoEventoItem,
  FotoEventoPayload
} from "@/types/fotos-eventos";

export const fotosEventosService = {
  async resumo() {
    const { data } = await httpClient.get<{ totalAlbuns: number; totalFotos: number }>("/api/fotos-eventos/resumo");
    return data;
  },

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

  async excluirEmLote(ids: number[]) {
    const { data } = await httpClient.post<{ quantidade: number }>(
      "/api/fotos-eventos/excluir-em-lote",
      { ids }
    );
    return data;
  },

  async adicionarFoto(
    id: number,
    payload: FotoEventoFotosLotePayload["fotos"][number]
  ) {
    const { data } = await httpClient.post<FotoEventoItem>(`/api/fotos-eventos/${id}/fotos`, payload);
    return data;
  },

  async adicionarFotosLote(
    id: number,
    payload: FotoEventoFotosLotePayload,
    options?: { onUploadProgress?: (progressEvent: AxiosProgressEvent) => void }
  ) {
    const { data } = await httpClient.post<{ fotos: FotoEventoItem[] }>(
      `/api/fotos-eventos/${id}/fotos/lote`,
      payload,
      { timeout: 300000, onUploadProgress: options?.onUploadProgress }
    );
    return data.fotos;
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

  async definirCapa(id: number, fotoId: number) {
    const { data } = await httpClient.put<FotoEventoItem>(
      `/api/fotos-eventos/${id}/fotos/${fotoId}/capa`
    );
    return data;
  },

  async reordenarFotos(id: number, fotoIds: number[]) {
    const { data } = await httpClient.put<{ fotos: FotoEventoItem[] }>(
      `/api/fotos-eventos/${id}/fotos/reordenar`,
      { fotoIds }
    );
    return data.fotos;
  },

  async removerFoto(id: number, fotoId: number) {
    await httpClient.delete(`/api/fotos-eventos/${id}/fotos/${fotoId}`);
  }
};
