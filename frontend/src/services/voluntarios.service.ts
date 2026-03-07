import { httpClient } from "./http-client";
import type {
  Voluntario,
  VoluntarioFiltro,
  VoluntarioItemResponse,
  VoluntarioListaResponse
} from "@/types/voluntario";

export const voluntariosService = {
  async listar(filtros?: VoluntarioFiltro): Promise<VoluntarioListaResponse> {
    const { data } = await httpClient.get<VoluntarioListaResponse>("/api/voluntarios", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<VoluntarioItemResponse> {
    const { data } = await httpClient.get<VoluntarioItemResponse>(`/api/voluntarios/${id}`);
    return data;
  },

  async criar(payload: Voluntario): Promise<VoluntarioItemResponse> {
    const { data } = await httpClient.post<VoluntarioItemResponse>("/api/voluntarios", payload);
    return data;
  },

  async atualizar(id: string, payload: Voluntario): Promise<VoluntarioItemResponse> {
    const { data } = await httpClient.put<VoluntarioItemResponse>(`/api/voluntarios/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/voluntarios/${id}`);
  }
};
