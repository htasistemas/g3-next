import { httpClient } from "./http-client";
import type { LembreteDiario, LembreteDiarioPayload } from "@/types/lembrete-diario";

export const lembretesDiariosService = {
  async listar(usuarioId?: number) {
    const { data } = await httpClient.get<LembreteDiario[]>("/api/lembretes-diarios", {
      params: usuarioId ? { usuario_id: usuarioId } : undefined
    });
    return data;
  },

  async criar(payload: LembreteDiarioPayload) {
    const { data } = await httpClient.post<LembreteDiario>("/api/lembretes-diarios", payload);
    return data;
  },

  async atualizar(id: number, payload: LembreteDiarioPayload) {
    const { data } = await httpClient.put<LembreteDiario>(`/api/lembretes-diarios/${id}`, payload);
    return data;
  },

  async concluir(id: number) {
    const { data } = await httpClient.patch<LembreteDiario>(`/api/lembretes-diarios/${id}/concluir`);
    return data;
  },

  async adiar(id: number, novaDataHora: string) {
    const { data } = await httpClient.patch<LembreteDiario>(`/api/lembretes-diarios/${id}/adiar`, {
      novaDataHora
    });
    return data;
  },

  async excluir(id: number) {
    await httpClient.delete(`/api/lembretes-diarios/${id}`);
  }
};
