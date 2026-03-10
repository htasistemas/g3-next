import { httpClient } from "./http-client";
import type {
  ContaBancaria,
  ContaBancariaPayload,
  EmendaImpositiva,
  EmendaImpositivaPayload,
  LancamentoFinanceiro,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceira,
  MovimentacaoFinanceiraPayload,
  ReciboPagamento
} from "@/types/contabilidade";

const baseUrl = "/api/contabilidade";

export const contabilidadeService = {
  async listarContasBancarias() {
    const { data } = await httpClient.get<ContaBancaria[]>(`${baseUrl}/contas-bancarias`);
    return data;
  },

  async criarContaBancaria(payload: ContaBancariaPayload) {
    const { data } = await httpClient.post<ContaBancaria>(`${baseUrl}/contas-bancarias`, payload);
    return data;
  },

  async atualizarContaBancaria(id: string | number, payload: ContaBancariaPayload) {
    const { data } = await httpClient.put<ContaBancaria>(`${baseUrl}/contas-bancarias/${id}`, payload);
    return data;
  },

  async removerContaBancaria(id: string | number) {
    await httpClient.delete(`${baseUrl}/contas-bancarias/${id}`);
  },

  async listarLancamentos() {
    const { data } = await httpClient.get<LancamentoFinanceiro[]>(`${baseUrl}/lancamentos`);
    return data;
  },

  async criarLancamento(payload: LancamentoFinanceiroPayload) {
    const { data } = await httpClient.post<LancamentoFinanceiro>(`${baseUrl}/lancamentos`, payload);
    return data;
  },

  async atualizarLancamento(id: string | number, payload: LancamentoFinanceiroPayload) {
    const { data } = await httpClient.put<LancamentoFinanceiro>(`${baseUrl}/lancamentos/${id}`, payload);
    return data;
  },

  async atualizarSituacaoLancamento(id: string | number, status: string) {
    const { data } = await httpClient.patch<LancamentoFinanceiro>(
      `${baseUrl}/lancamentos/${id}/status`,
      { status }
    );
    return data;
  },

  async pagarLancamento(id: string | number, responsavel?: string, data?: string) {
    const { data: resposta } = await httpClient.post<ReciboPagamento>(
      `${baseUrl}/lancamentos/${id}/pagamento`,
      { responsavel, data }
    );
    return resposta;
  },

  async removerLancamento(id: string | number) {
    await httpClient.delete(`${baseUrl}/lancamentos/${id}`);
  },

  async listarMovimentacoes() {
    const { data } = await httpClient.get<MovimentacaoFinanceira[]>(`${baseUrl}/movimentacoes`);
    return data;
  },

  async criarMovimentacao(payload: MovimentacaoFinanceiraPayload) {
    const { data } = await httpClient.post<MovimentacaoFinanceira>(`${baseUrl}/movimentacoes`, payload);
    return data;
  },

  async atualizarMovimentacao(id: string | number, payload: MovimentacaoFinanceiraPayload) {
    const { data } = await httpClient.put<MovimentacaoFinanceira>(
      `${baseUrl}/movimentacoes/${id}`,
      payload
    );
    return data;
  },

  async removerMovimentacao(id: string | number) {
    await httpClient.delete(`${baseUrl}/movimentacoes/${id}`);
  },

  async listarEmendas() {
    const { data } = await httpClient.get<EmendaImpositiva[]>(`${baseUrl}/emendas`);
    return data;
  },

  async criarEmenda(payload: EmendaImpositivaPayload) {
    const { data } = await httpClient.post<EmendaImpositiva>(`${baseUrl}/emendas`, payload);
    return data;
  },

  async atualizarStatusEmenda(id: string | number, status: string) {
    const { data } = await httpClient.patch<EmendaImpositiva>(`${baseUrl}/emendas/${id}/status`, {
      status
    });
    return data;
  }
};
