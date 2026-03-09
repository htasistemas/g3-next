import { httpClient } from "./http-client";
import type {
  DoacaoRealizada,
  DoacaoRealizadaFiltro,
  DoacaoRealizadaItemResponse,
  DoacaoRealizadaListaResponse
} from "@/types/doacao-realizada";

export const doacoesRealizadasService = {
  async listar(filtros?: DoacaoRealizadaFiltro): Promise<DoacaoRealizadaListaResponse> {
    const { data } = await httpClient.get<DoacaoRealizadaListaResponse>("/api/doacoes-realizadas", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<DoacaoRealizadaItemResponse> {
    const { data } = await httpClient.get<DoacaoRealizadaItemResponse>(`/api/doacoes-realizadas/${id}`);
    return data;
  },

  async criar(payload: DoacaoRealizada): Promise<DoacaoRealizadaItemResponse> {
    const { data } = await httpClient.post<DoacaoRealizadaItemResponse>("/api/doacoes-realizadas", payload);
    return data;
  },

  async atualizar(id: string, payload: DoacaoRealizada): Promise<DoacaoRealizadaItemResponse> {
    const { data } = await httpClient.put<DoacaoRealizadaItemResponse>(`/api/doacoes-realizadas/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/doacoes-realizadas/${id}`);
  },

  async listarBeneficiarios(termo?: string) {
    const { data } = await httpClient.get<{ beneficiarios: Array<{ id: string; nome_completo: string; codigo?: string; cpf?: string }> }>(
      "/api/doacoes-realizadas/catalogo/beneficiarios",
      { params: { termo } }
    );
    return data;
  },

  async listarFamilias(termo?: string) {
    const { data } = await httpClient.get<{ familias: Array<{ id: string; nome_familia: string }> }>(
      "/api/doacoes-realizadas/catalogo/familias",
      { params: { termo } }
    );
    return data;
  },

  async listarItensEstoque(termo?: string) {
    const { data } = await httpClient.get<{
      itens: Array<{ id: string; codigo: string; descricao: string; unidade: string; estoque_atual: number }>;
    }>("/api/doacoes-realizadas/catalogo/itens", { params: { termo } });
    return data;
  }
};
