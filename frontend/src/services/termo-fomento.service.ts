import { httpClient } from "./http-client";
import type {
  AditivoTermoFomento,
  TermoFomento,
  TermoFomentoPayload
} from "@/types/termo-fomento";

export const termoFomentoService = {
  async listar() {
    const { data } = await httpClient.get<TermoFomento[]>("/api/termos-fomento");
    return data;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<TermoFomento>(`/api/termos-fomento/${id}`);
    return data;
  },

  async criar(payload: TermoFomentoPayload) {
    const { data } = await httpClient.post<TermoFomento>("/api/termos-fomento", payload);
    return data;
  },

  async atualizar(id: string, payload: TermoFomentoPayload) {
    const { data } = await httpClient.put<TermoFomento>(`/api/termos-fomento/${id}`, payload);
    return data;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/termos-fomento/${id}`);
  },

  async adicionarAditivo(termoId: string, payload: AditivoTermoFomento) {
    const { data } = await httpClient.post<TermoFomento>(
      `/api/termos-fomento/${termoId}/aditivos`,
      payload
    );
    return data;
  }
};
