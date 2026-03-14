import { httpClient } from "./http-client";
import type {
  AprovacaoCompraPayload,
  AutorizacaoCompraDetalhe,
  AutorizacaoCompraPayload,
  AutorizacaoCompraResumo,
  AutorizacaoCompraSetorSolicitante,
  AutorizacaoCotacao,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  EscolhaFornecedorPayload,
  FornecedorCnpj,
  PainelComprasIndicadores,
  ReservaBancaria,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

const baseUrl = "/api/financeiro/autorizacao-compras";

export const autorizacaoComprasService = {
  async listar() {
    const { data } = await httpClient.get<AutorizacaoCompraResumo[]>(baseUrl);
    return data;
  },

  async listarIndicadores() {
    const { data } = await httpClient.get<PainelComprasIndicadores>(`${baseUrl}/indicadores`);
    return data;
  },

  async listarSetoresSolicitantes() {
    const { data } = await httpClient.get<AutorizacaoCompraSetorSolicitante[]>(
      `${baseUrl}/catalogo/setores-solicitantes`
    );
    return data;
  },

  async buscarDetalhe(id: string | number) {
    const { data } = await httpClient.get<AutorizacaoCompraDetalhe>(`${baseUrl}/${id}`);
    return data;
  },

  async criar(payload: AutorizacaoCompraPayload) {
    const { data } = await httpClient.post<AutorizacaoCompraDetalhe>(baseUrl, payload);
    return data;
  },

  async atualizar(id: string | number, payload: AutorizacaoCompraPayload) {
    const { data } = await httpClient.put<AutorizacaoCompraDetalhe>(`${baseUrl}/${id}`, payload);
    return data;
  },

  async excluir(id: string | number) {
    await httpClient.delete(`${baseUrl}/${id}`);
  },

  async enviarParaAprovacao(id: string | number) {
    const { data } = await httpClient.post<AutorizacaoCompraDetalhe>(`${baseUrl}/${id}/enviar-aprovacao`);
    return data;
  },

  async registrarAprovacao(id: string | number, payload: AprovacaoCompraPayload) {
    const { data } = await httpClient.post<AutorizacaoCompraDetalhe>(`${baseUrl}/${id}/aprovacoes`, payload);
    return data;
  },

  async listarCotacoes(id: string | number) {
    const { data } = await httpClient.get<AutorizacaoCotacao[]>(`${baseUrl}/${id}/cotacoes`);
    return data;
  },

  async criarCotacao(id: string | number, payload: AutorizacaoCotacaoPayload) {
    const { data } = await httpClient.post<AutorizacaoCotacao[]>(`${baseUrl}/${id}/cotacoes`, payload);
    return data;
  },

  async excluirCotacao(id: string | number, cotacaoId: string | number) {
    await httpClient.delete(`${baseUrl}/${id}/cotacoes/${cotacaoId}`);
  },

  async definirFornecedor(id: string | number, payload: EscolhaFornecedorPayload) {
    const { data } = await httpClient.post<AutorizacaoCompraDetalhe>(
      `${baseUrl}/${id}/fornecedor-vencedor`,
      payload
    );
    return data;
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
    const { data } = await httpClient.post<ReservaBancaria[]>(
      `${baseUrl}/${id}/reservas-bancarias`,
      payload
    );
    return data;
  },

  async removerReservaBancaria(id: string | number, reservaId: string | number) {
    await httpClient.delete(`${baseUrl}/${id}/reservas-bancarias/${reservaId}`);
  },

  async gerarAutorizacaoPagamento(id: string | number, payload: AutorizacaoPagamentoPayload) {
    const { data } = await httpClient.post<AutorizacaoCompraDetalhe>(
      `${baseUrl}/${id}/autorizacao-pagamento`,
      payload
    );
    return data;
  }
};
