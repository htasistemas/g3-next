import { httpClient } from "./http-client";
import type {
  DoacaoPlanejada,
  DoacaoPlanejadaFiltro,
  DoacaoPlanejadaItemResponse,
  DoacaoPlanejadaListaResponse
} from "@/types/doacao-planejada";

export const doacoesPlanejadasService = {
  async listar(filtros?: DoacaoPlanejadaFiltro): Promise<DoacaoPlanejadaListaResponse> {
    const { data } = await httpClient.get<DoacaoPlanejadaListaResponse>("/api/doacoes-planejadas", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<DoacaoPlanejadaItemResponse> {
    const { data } = await httpClient.get<DoacaoPlanejadaItemResponse>(`/api/doacoes-planejadas/${id}`);
    return data;
  },

  async criar(payload: DoacaoPlanejada): Promise<DoacaoPlanejadaItemResponse> {
    const { data } = await httpClient.post<DoacaoPlanejadaItemResponse>("/api/doacoes-planejadas", payload);
    return data;
  },

  async atualizar(id: string, payload: DoacaoPlanejada): Promise<DoacaoPlanejadaItemResponse> {
    const { data } = await httpClient.put<DoacaoPlanejadaItemResponse>(`/api/doacoes-planejadas/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/doacoes-planejadas/${id}`);
  }
};

