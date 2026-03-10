import { httpClient } from "./http-client";
import type { OficioImagemPayload, OficioPayload, OficioPdfAssinadoPayload } from "@/types/oficio";

export const oficiosService = {
  async listar() {
    const { data } = await httpClient.get<{ oficios: OficioPayload[] }>("/api/oficios");
    return data;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<OficioPayload>(`/api/oficios/${id}`);
    return data;
  },

  async criar(payload: OficioPayload) {
    const { data } = await httpClient.post<OficioPayload>("/api/oficios", payload);
    return data;
  },

  async atualizar(id: string, payload: OficioPayload) {
    const { data } = await httpClient.put<OficioPayload>(`/api/oficios/${id}`, payload);
    return data;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/oficios/${id}`);
  },

  async salvarPdfAssinado(id: string, payload: OficioPdfAssinadoPayload) {
    const { data } = await httpClient.post<OficioPayload>(`/api/oficios/${id}/pdf-assinado`, payload);
    return data;
  },

  async obterPdfAssinado(id: string) {
    const { data } = await httpClient.get<{
      nomeArquivo: string;
      tipoMime: string;
      conteudoBase64: string;
    }>(`/api/oficios/${id}/pdf-assinado`);
    return data;
  },

  async removerPdfAssinado(id: string) {
    await httpClient.delete(`/api/oficios/${id}/pdf-assinado`);
  },

  async listarImagens(id: string) {
    const { data } = await httpClient.get<OficioImagemPayload[]>(`/api/oficios/${id}/imagens`);
    return data;
  },

  async adicionarImagem(id: string, payload: OficioImagemPayload) {
    const { data } = await httpClient.post<OficioImagemPayload>(`/api/oficios/${id}/imagens`, payload);
    return data;
  },

  async removerImagem(id: string, imagemId: string) {
    await httpClient.delete(`/api/oficios/${id}/imagens/${imagemId}`);
  }
};
