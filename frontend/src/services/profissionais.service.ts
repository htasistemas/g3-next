import { httpClient } from "./http-client";
import type {
  Profissional,
  ProfissionalFiltro,
  ProfissionalItemResponse,
  ProfissionalListaResponse
} from "@/types/profissional";

export const profissionaisService = {
  async listar(filtros?: ProfissionalFiltro): Promise<ProfissionalListaResponse> {
    const { data } = await httpClient.get<ProfissionalListaResponse>("/api/profissionais", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<ProfissionalItemResponse> {
    const { data } = await httpClient.get<ProfissionalItemResponse>(`/api/profissionais/${id}`);
    return data;
  },

  async criar(payload: Profissional): Promise<ProfissionalItemResponse> {
    const { data } = await httpClient.post<ProfissionalItemResponse>("/api/profissionais", payload);
    return data;
  },

  async atualizar(id: string, payload: Profissional): Promise<ProfissionalItemResponse> {
    const { data } = await httpClient.put<ProfissionalItemResponse>(`/api/profissionais/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/profissionais/${id}`);
  }
};
