import { httpClient } from "./http-client";
import type { PlanoTrabalho, PlanoTrabalhoPayload } from "@/types/plano-trabalho";

export const planoTrabalhoService = {
  async listar() {
    const { data } = await httpClient.get<{ planos: PlanoTrabalho[] }>("/api/planos-trabalho");
    return data.planos;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<{ plano: PlanoTrabalho }>(`/api/planos-trabalho/${id}`);
    return data.plano;
  },

  async criar(payload: PlanoTrabalhoPayload) {
    const { data } = await httpClient.post<{ plano: PlanoTrabalho }>("/api/planos-trabalho", payload);
    return data.plano;
  },

  async atualizar(id: string, payload: PlanoTrabalhoPayload) {
    const { data } = await httpClient.put<{ plano: PlanoTrabalho }>(
      `/api/planos-trabalho/${id}`,
      payload
    );
    return data.plano;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/planos-trabalho/${id}`);
  }
};
