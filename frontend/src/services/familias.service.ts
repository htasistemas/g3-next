import { httpClient } from "./http-client";
import type {
  Familia,
  FamiliaAlertaResponse,
  FamiliaDesmembramentoPayload,
  FamiliaDesmembramentoResponse,
  FamiliaEnderecoPayload,
  FamiliaFiltro,
  FamiliaHistoricoResponse,
  FamiliaItemResponse,
  FamiliaListaResponse,
  FamiliaMembro,
  FamiliaTransferenciaPayload,
  FamiliaTransferenciaResponse,
  FamiliaValidacaoBeneficio
} from "@/types/familia";

export const familiasService = {
  async listar(filtros?: FamiliaFiltro): Promise<FamiliaListaResponse> {
    const { data } = await httpClient.get<FamiliaListaResponse>("/api/familias", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.get<FamiliaItemResponse>(`/api/familias/${id}`);
    return data;
  },

  async criar(payload: Familia): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.post<FamiliaItemResponse>("/api/familias", payload);
    return data;
  },

  async atualizar(id: string, payload: Familia): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(`/api/familias/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/familias/${id}`);
  },

  async adicionarMembro(id: string, payload: FamiliaMembro): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.post<FamiliaItemResponse>(`/api/familias/${id}/membros`, payload);
    return data;
  },

  async atualizarMembro(id: string, membroId: string, payload: FamiliaMembro): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(
      `/api/familias/${id}/membros/${membroId}`,
      payload
    );
    return data;
  },

  async removerMembro(id: string, membroId: string): Promise<void> {
    await httpClient.delete(`/api/familias/${id}/membros/${membroId}`);
  },

  async listarHistorico(id: string): Promise<FamiliaHistoricoResponse> {
    const { data } = await httpClient.get<FamiliaHistoricoResponse>(`/api/familias/${id}/historico`);
    return data;
  },

  async listarAlertas(id: string): Promise<FamiliaAlertaResponse> {
    const { data } = await httpClient.get<FamiliaAlertaResponse>(`/api/familias/${id}/alertas`);
    return data;
  },

  async definirResponsavel(id: string, idBeneficiario: string): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(`/api/familias/${id}/responsavel`, {
      id_beneficiario: Number(idBeneficiario)
    });
    return data;
  },

  async atualizarEndereco(id: string, payload: FamiliaEnderecoPayload): Promise<FamiliaItemResponse> {
    const { data } = await httpClient.put<FamiliaItemResponse>(`/api/familias/${id}/endereco`, payload);
    return data;
  },

  async validarBeneficioFamiliar(
    id: string,
    beneficioNome: string,
    quantidadeDiasCarencia?: number
  ): Promise<FamiliaValidacaoBeneficio> {
    const { data } = await httpClient.get<FamiliaValidacaoBeneficio>(
      `/api/familias/${id}/beneficios/validacao`,
      {
        params: {
          beneficio_nome: beneficioNome,
          quantidade_dias_carencia: quantidadeDiasCarencia
        }
      }
    );
    return data;
  },

  async transferirMembro(
    id: string,
    payload: FamiliaTransferenciaPayload
  ): Promise<FamiliaTransferenciaResponse> {
    const { data } = await httpClient.post<FamiliaTransferenciaResponse>(
      `/api/familias/${id}/membros/transferir`,
      payload
    );
    return data;
  },

  async desmembrarFamilia(
    id: string,
    payload: FamiliaDesmembramentoPayload
  ): Promise<FamiliaDesmembramentoResponse> {
    const { data } = await httpClient.post<FamiliaDesmembramentoResponse>(
      `/api/familias/${id}/desmembrar`,
      payload
    );
    return data;
  }
};
