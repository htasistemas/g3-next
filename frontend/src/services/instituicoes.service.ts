import { httpClient } from "./http-client";
import type { InstituicaoPayload, InstituicaoResumo } from "@/types/instituicao";

export const instituicoesService = {
  async listar(): Promise<InstituicaoResumo[]> {
    const { data } = await httpClient.get<{ instituicoes: InstituicaoResumo[] }>("/api/master/instituicoes");
    return data.instituicoes ?? [];
  },

  async criar(payload: InstituicaoPayload): Promise<InstituicaoResumo> {
    const { data } = await httpClient.post<{ instituicao: InstituicaoResumo }>(
      "/api/master/instituicoes",
      payload
    );
    return data.instituicao;
  },

  async atualizar(id: string, payload: Partial<InstituicaoPayload>): Promise<InstituicaoResumo> {
    const { data } = await httpClient.put<{ instituicao: InstituicaoResumo }>(
      `/api/master/instituicoes/${id}`,
      payload
    );
    return data.instituicao;
  },

  async resetarAdmin(id: string, payload: { email?: string; nova_senha: string }) {
    const { data } = await httpClient.post<{ sucesso: boolean }>(
      `/api/master/instituicoes/${id}/resetar-admin`,
      payload
    );
    return data;
  },

  async desbloquearAcesso(id: string) {
    const { data } = await httpClient.post<{
      sucesso: boolean;
      instituicoes_desbloqueadas: number;
      usuarios_desbloqueados: number;
    }>(`/api/master/instituicoes/${id}/desbloquear-acesso`);
    return data;
  }
};
