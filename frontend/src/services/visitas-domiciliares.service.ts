import { httpClient } from "./http-client";
import type { VisitaDomiciliar, VisitaDomiciliarListaResponse } from "@/types/visita-domiciliar";

export const visitasDomiciliaresService = {
  async listar() {
    const { data } = await httpClient.get<VisitaDomiciliarListaResponse>("/api/visitas-domiciliares");
    return data.visitas ?? [];
  },

  async criar(payload: VisitaDomiciliar) {
    const { data } = await httpClient.post<VisitaDomiciliar>("/api/visitas-domiciliares", {
      ...payload,
      beneficiarioId: payload.beneficiarioId
    });
    return data;
  },

  async atualizar(id: number, payload: VisitaDomiciliar) {
    const { data } = await httpClient.put<VisitaDomiciliar>(`/api/visitas-domiciliares/${id}`, {
      ...payload,
      beneficiarioId: payload.beneficiarioId
    });
    return data;
  },

  async remover(id: number) {
    await httpClient.delete(`/api/visitas-domiciliares/${id}`);
  }
};

