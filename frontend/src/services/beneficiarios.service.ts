import { httpClient } from "./http-client";
import type {
  Beneficiario,
  BeneficiarioFiltro,
  BeneficiarioItemResponse,
  BeneficiarioListaResponse
} from "@/types/beneficiario";

export const beneficiariosService = {
  async listar(filtros?: BeneficiarioFiltro): Promise<BeneficiarioListaResponse> {
    const { data } = await httpClient.get<BeneficiarioListaResponse>("/api/beneficiarios", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.get<BeneficiarioItemResponse>(`/api/beneficiarios/${id}`);
    return data;
  },

  async criar(payload: Beneficiario): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.post<BeneficiarioItemResponse>("/api/beneficiarios", payload);
    return data;
  },

  async atualizar(id: string, payload: Beneficiario): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.put<BeneficiarioItemResponse>(`/api/beneficiarios/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/beneficiarios/${id}`);
  },

  async obterProximoCodigo(): Promise<{ codigo: string }> {
    const { data } = await httpClient.get<{ codigo: string }>("/api/beneficiarios/proximo-codigo");
    return data;
  }
};
