import { httpClient } from "./http-client";
import type {
  Doador,
  RegistroDoacao,
  RegistroDoacaoFiltro,
  RegistroDoacaoItemResponse,
  RegistroDoacaoListaResponse
} from "@/types/registro-doacao";

export const registroDoacaoService = {
  async listar(filtros?: RegistroDoacaoFiltro): Promise<RegistroDoacaoListaResponse> {
    const { data } = await httpClient.get<RegistroDoacaoListaResponse>("/api/registro-doacao", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<RegistroDoacaoItemResponse> {
    const { data } = await httpClient.get<RegistroDoacaoItemResponse>(`/api/registro-doacao/${id}`);
    return data;
  },

  async criar(payload: RegistroDoacao): Promise<RegistroDoacaoItemResponse> {
    const { data } = await httpClient.post<RegistroDoacaoItemResponse>("/api/registro-doacao", payload);
    return data;
  },

  async atualizar(id: string, payload: RegistroDoacao): Promise<RegistroDoacaoItemResponse> {
    const { data } = await httpClient.put<RegistroDoacaoItemResponse>(`/api/registro-doacao/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/registro-doacao/${id}`);
  },

  async listarDoadores(termo?: string) {
    const { data } = await httpClient.get<{ doadores: Doador[] }>("/api/registro-doacao/doadores", {
      params: { termo }
    });
    return data;
  },

  async criarDoador(payload: Doador) {
    const { data } = await httpClient.post<{ doador: Doador }>("/api/registro-doacao/doadores", payload);
    return data;
  },

  async removerDoador(id: string) {
    await httpClient.delete(`/api/registro-doacao/doadores/${id}`);
  }
};
