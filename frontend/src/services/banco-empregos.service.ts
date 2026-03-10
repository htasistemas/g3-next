import { httpClient } from "./http-client";
import type { JobCandidato, JobPayload, JobRecord } from "@/types/banco-empregos";

export const bancoEmpregosService = {
  async listar() {
    const { data } = await httpClient.get<JobRecord[]>("/api/banco-empregos");
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<JobRecord>(`/api/banco-empregos/${id}`);
    return data;
  },

  async criar(payload: JobPayload) {
    const { data } = await httpClient.post<JobRecord>("/api/banco-empregos", payload);
    return data;
  },

  async atualizar(id: string, payload: JobPayload) {
    const { data } = await httpClient.put<JobRecord>(`/api/banco-empregos/${id}`, payload);
    return data;
  },

  async remover(id: string) {
    await httpClient.delete(`/api/banco-empregos/${id}`);
  },

  async listarCandidatos(empregoId: string) {
    const { data } = await httpClient.get<JobCandidato[]>(`/api/banco-empregos/${empregoId}/candidatos`);
    return data;
  },

  async criarCandidato(
    empregoId: string,
    payload: Omit<JobCandidato, "id" | "criadoEm" | "empregoId">
  ) {
    const { data } = await httpClient.post<JobCandidato>(`/api/banco-empregos/${empregoId}/candidatos`, payload);
    return data;
  },

  async removerCandidato(candidatoId: string) {
    await httpClient.delete(`/api/banco-empregos/candidatos/${candidatoId}`);
  }
};

