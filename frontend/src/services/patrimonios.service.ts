import { httpClient } from "./http-client";
import type { Patrimonio, PatrimonioMovimento } from "@/types/patrimonio";

export const patrimoniosService = {
  async listar() {
    const { data } = await httpClient.get<{ patrimonios: Patrimonio[] }>("/api/patrimonios");
    return data;
  },

  async criar(payload: Patrimonio) {
    const { data } = await httpClient.post<{ patrimonio: Patrimonio }>("/api/patrimonios", payload);
    return data;
  },

  async atualizar(id: string, payload: Patrimonio) {
    const { data } = await httpClient.put<{ patrimonio: Patrimonio }>(`/api/patrimonios/${id}`, payload);
    return data;
  },

  async registrarMovimento(id: string, payload: PatrimonioMovimento) {
    const { data } = await httpClient.post<{ patrimonio: Patrimonio }>(
      `/api/patrimonios/${id}/movimentos`,
      payload
    );
    return data;
  }
};
