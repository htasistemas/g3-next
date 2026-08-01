import { httpClient } from "./http-client";
import type { PrestacaoContas, PrestacaoContasPayload } from "@/types/prestacao-contas";

const baseUrl = "/api/transparencias";

export const prestacaoContasService = {
  async listar() {
    const { data } = await httpClient.get<{ transparencias: PrestacaoContas[] }>(baseUrl);
    return data.transparencias;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<{ transparencia: PrestacaoContas }>(`${baseUrl}/${id}`);
    return data.transparencia;
  },

  async criar(payload: PrestacaoContasPayload) {
    const { data } = await httpClient.post<{ transparencia: PrestacaoContas }>(baseUrl, payload);
    return data.transparencia;
  },

  async atualizar(id: string, payload: PrestacaoContasPayload) {
    const { data } = await httpClient.put<{ transparencia: PrestacaoContas }>(
      `${baseUrl}/${id}`,
      payload
    );
    return data.transparencia;
  },

  async excluir(id: string) {
    await httpClient.delete(`${baseUrl}/${id}`);
  },

  async alterarWorkflow(id: string, acao: string) {
    const { data } = await httpClient.post<{ transparencia: PrestacaoContas }>(`${baseUrl}/${id}/workflow`, { acao });
    return data.transparencia;
  }
};
