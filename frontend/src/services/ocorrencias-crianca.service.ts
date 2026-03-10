import { httpClient } from "./http-client";
import type { OcorrenciaCriancaAnexoPayload, OcorrenciaCriancaPayload } from "@/types/ocorrencia-crianca";

export const ocorrenciasCriancaService = {
  async listar() {
    const { data } = await httpClient.get<OcorrenciaCriancaPayload[]>("/api/ocorrencias-crianca");
    return data ?? [];
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<OcorrenciaCriancaPayload>(`/api/ocorrencias-crianca/${id}`);
    return data;
  },

  async criar(payload: OcorrenciaCriancaPayload) {
    const { data } = await httpClient.post<OcorrenciaCriancaPayload>("/api/ocorrencias-crianca", payload);
    return data;
  },

  async atualizar(id: string, payload: OcorrenciaCriancaPayload) {
    const { data } = await httpClient.put<OcorrenciaCriancaPayload>(`/api/ocorrencias-crianca/${id}`, payload);
    return data;
  },

  async remover(id: string) {
    await httpClient.delete(`/api/ocorrencias-crianca/${id}`);
  },

  async listarAnexos(id: string) {
    const { data } = await httpClient.get<OcorrenciaCriancaAnexoPayload[]>(`/api/ocorrencias-crianca/${id}/anexos`);
    return data ?? [];
  },

  async adicionarAnexo(id: string, payload: OcorrenciaCriancaAnexoPayload) {
    const { data } = await httpClient.post<OcorrenciaCriancaAnexoPayload>(
      `/api/ocorrencias-crianca/${id}/anexos`,
      payload
    );
    return data;
  },

  async removerAnexo(id: string, anexoId: string) {
    await httpClient.delete(`/api/ocorrencias-crianca/${id}/anexos/${anexoId}`);
  },

  obterPdfDenunciaUrl(id: string) {
    return `${httpClient.defaults.baseURL}/api/ocorrencias-crianca/${id}/pdf/denuncia`;
  },

  obterPdfConselhoTutelarUrl(id: string) {
    return `${httpClient.defaults.baseURL}/api/ocorrencias-crianca/${id}/pdf/conselho-tutelar`;
  }
};

