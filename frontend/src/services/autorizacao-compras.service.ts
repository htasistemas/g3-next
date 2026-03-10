import { httpClient } from "./http-client";
import type {
  AutorizacaoCompra,
  AutorizacaoCompraPayload,
  AutorizacaoCotacao,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  FornecedorCnpj,
  ReservaBancaria,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

const baseUrl = "/api/financeiro/autorizacao-compras";

export const autorizacaoComprasService = {
  async listar() {
    const { data } = await httpClient.get<AutorizacaoCompra[]>(baseUrl);
    return data;
  },

  async criar(payload: AutorizacaoCompraPayload) {
    const { data } = await httpClient.post<AutorizacaoCompra>(baseUrl, payload);
    return data;
  },

  async atualizar(id: string | number, payload: AutorizacaoCompraPayload) {
    const { data } = await httpClient.put<AutorizacaoCompra>(`${baseUrl}/${id}`, payload);
    return data;
  },

  async excluir(id: string | number) {
    await httpClient.delete(`${baseUrl}/${id}`);
  },

  async listarCotacoes(id: string | number) {
    const { data } = await httpClient.get<AutorizacaoCotacao[]>(`${baseUrl}/${id}/cotacoes`);
    return data;
  },

  async criarCotacao(id: string | number, payload: AutorizacaoCotacaoPayload) {
    const { data } = await httpClient.post<AutorizacaoCotacao>(`${baseUrl}/${id}/cotacoes`, payload);
    return data;
  },

  async excluirCotacao(id: string | number, cotacaoId: string | number) {
    await httpClient.delete(`${baseUrl}/${id}/cotacoes/${cotacaoId}`);
  },

  async buscarFornecedorPorCnpj(cnpj: string) {
    const { data } = await httpClient.get<FornecedorCnpj>(`${baseUrl}/fornecedores/cnpj/${cnpj}`);
    return data;
  },

  async listarReservas(id: string | number) {
    const { data } = await httpClient.get<ReservaBancaria[]>(`${baseUrl}/${id}/reservas-bancarias`);
    return data;
  },

  async registrarReservaBancaria(id: string | number, payload: ReservaBancariaPayload) {
    const { data } = await httpClient.post<ReservaBancaria>(`${baseUrl}/${id}/reservas-bancarias`, payload);
    return data;
  },

  async removerReservaBancaria(id: string | number, contaId: string | number) {
    await httpClient.delete(`${baseUrl}/${id}/reservas-bancarias/${contaId}`);
  },

  async gerarAutorizacaoPagamento(id: string | number, payload: AutorizacaoPagamentoPayload) {
    const { data } = await httpClient.post<AutorizacaoCompra>(
      `${baseUrl}/${id}/autorizacao-pagamento`,
      payload
    );
    return data;
  }
};
