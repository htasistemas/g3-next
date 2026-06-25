import { httpClient } from "./http-client";
import type {
  UnidadeAssistencial,
  UnidadeAssistencialFiltro,
  UnidadeAssistencialItemResponse,
  UnidadeAssistencialListaResponse
} from "@/types/unidade-assistencial";

export const unidadesAssistenciaisService = {
  async listar(filtros?: UnidadeAssistencialFiltro): Promise<UnidadeAssistencialListaResponse> {
    const { data } = await httpClient.get<UnidadeAssistencialListaResponse>(
      "/api/unidades-assistenciais",
      { params: filtros }
    );
    return data;
  },

  async buscarPorId(id: string): Promise<UnidadeAssistencialItemResponse> {
    const { data } = await httpClient.get<UnidadeAssistencialItemResponse>(
      `/api/unidades-assistenciais/${id}`
    );
    return data;
  },

  async buscarAtual(): Promise<UnidadeAssistencialItemResponse> {
    const { data } =
      await httpClient.get<UnidadeAssistencialItemResponse>("/api/unidades-assistenciais/atual");
    return data;
  },

  async criar(payload: UnidadeAssistencial): Promise<UnidadeAssistencialItemResponse> {
    const { data } = await httpClient.post<UnidadeAssistencialItemResponse>(
      "/api/unidades-assistenciais",
      payload
    );
    return data;
  },

  async atualizar(id: string, payload: UnidadeAssistencial): Promise<UnidadeAssistencialItemResponse> {
    const { data } = await httpClient.put<UnidadeAssistencialItemResponse>(
      `/api/unidades-assistenciais/${id}`,
      payload
    );
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/unidades-assistenciais/${id}`);
  },

  async verificarVinculosSala(salaId: string): Promise<{ possuiVinculo: boolean; total: number }> {
    const { data } = await httpClient.get<{ possuiVinculo: boolean; total: number }>(
      `/api/unidades-assistenciais/salas/${salaId}/vinculos`
    );
    return data;
  }
};
