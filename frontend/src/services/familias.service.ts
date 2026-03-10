import { httpClient } from "./http-client";
import type {
  Familia,
  FamiliaFiltro,
  FamiliaItemResponse,
  FamiliaListaResponse,
  FamiliaMembro
} from "@/types/familia";

export const familiasService = {
  async listar(filtros?: FamiliaFiltro): Promise<FamiliaListaResponse> {
    const { data } = await httpClient.get<FamiliaListaResponse>("/api/familias", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.get<FamiliaItemResponse>(`/api/familias/${id}`);
    return data;
  },

  async criar(payload: Familia): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.post<FamiliaItemResponse>("/api/familias", payload);
    return data;
  },

  async atualizar(id: string, payload: Familia): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(`/api/familias/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/familias/${id}`);
  },

  async adicionarMembro(id: string, payload: FamiliaMembro): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.post<FamiliaItemResponse>(`/api/familias/${id}/membros`, payload);
    return data;
  },

  async atualizarMembro(
    id: string,
    membroId: string,
    payload: FamiliaMembro
  ): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(
      `/api/familias/${id}/membros/${membroId}`,
      payload
    );
    return data;
  },

  async removerMembro(id: string, membroId: string): Promise<void> {
    await httpClient.delete(`/api/familias/${id}/membros/${membroId}`);
  }
};
