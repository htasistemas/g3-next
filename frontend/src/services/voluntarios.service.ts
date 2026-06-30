import { httpClient } from "./http-client";
import type {
  Voluntario,
  VoluntarioEscalaItemResponse,
  VoluntarioEscalaListaResponse,
  VoluntarioEscalaPayload,
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
  },

  async listarEscalas(voluntarioId: string): Promise<VoluntarioEscalaListaResponse> {
    const { data } = await httpClient.get<VoluntarioEscalaListaResponse>(`/api/voluntarios/${voluntarioId}/escalas`);
    return data;
  },

  async criarEscala(payload: VoluntarioEscalaPayload): Promise<VoluntarioEscalaItemResponse> {
    const { data } = await httpClient.post<VoluntarioEscalaItemResponse>("/api/voluntarios/escalas", payload);
    return data;
  },

  async atualizarEscala(id: string, payload: VoluntarioEscalaPayload): Promise<VoluntarioEscalaItemResponse> {
    const { data } = await httpClient.put<VoluntarioEscalaItemResponse>(`/api/voluntarios/escalas/${id}`, payload);
    return data;
  },

  async removerEscala(id: string): Promise<void> {
    await httpClient.delete(`/api/voluntarios/escalas/${id}`);
  }
};
