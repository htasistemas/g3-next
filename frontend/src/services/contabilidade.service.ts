import { httpClient } from './http-client';
import type {
  CategoriaFinanceira,
  CategoriaFinanceiraPayload,
  CentroCusto,
  CentroCustoPayload,
  CompraIntegradaFinanceira,
  ConciliacaoFinanceira,
  ConciliacaoFinanceiraPayload,
  ContaBancaria,
  ContaBancariaPayload,
  EmendaImpositiva,
  EmendaImpositivaPayload,
  FechamentoMensal,
  FechamentoMensalPayload,
  HistoricoContabilidade,
  LancamentoFinanceiro,
  LancamentoFinanceiroBaixaPayload,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceira,
  MovimentacaoFinanceiraPayload,
  RemocaoLancamentoFinanceiroPayload,
  ReciboPagamento,
  TransferenciaFinanceira,
  TransferenciaFinanceiraPayload
} from '@/types/contabilidade';

const baseUrl = '/api/contabilidade';

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

  async listarCategorias() {
    const { data } = await httpClient.get<CategoriaFinanceira[]>(`${baseUrl}/categorias`);
    return data;
  },

  async criarCategoria(payload: CategoriaFinanceiraPayload) {
    const { data } = await httpClient.post<CategoriaFinanceira>(`${baseUrl}/categorias`, payload);
    return data;
  },

  async atualizarCategoria(id: string | number, payload: CategoriaFinanceiraPayload) {
    const { data } = await httpClient.put<CategoriaFinanceira>(`${baseUrl}/categorias/${id}`, payload);
    return data;
  },

  async removerCategoria(id: string | number) {
    await httpClient.delete(`${baseUrl}/categorias/${id}`);
  },

  async listarCentrosCusto() {
    const { data } = await httpClient.get<CentroCusto[]>(`${baseUrl}/centros-custo`);
    return data;
  },

  async criarCentroCusto(payload: CentroCustoPayload) {
    const { data } = await httpClient.post<CentroCusto>(`${baseUrl}/centros-custo`, payload);
    return data;
  },

  async atualizarCentroCusto(id: string | number, payload: CentroCustoPayload) {
    const { data } = await httpClient.put<CentroCusto>(`${baseUrl}/centros-custo/${id}`, payload);
    return data;
  },

  async removerCentroCusto(id: string | number) {
    await httpClient.delete(`${baseUrl}/centros-custo/${id}`);
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

  async pagarLancamento(id: string | number, payload: LancamentoFinanceiroBaixaPayload) {
    const { data } = await httpClient.post<ReciboPagamento>(
      `${baseUrl}/lancamentos/${id}/pagamento`,
      payload
    );
    return data;
  },

  async estornarLancamento(id: string | number) {
    const { data } = await httpClient.patch<LancamentoFinanceiro>(
      `${baseUrl}/lancamentos/${id}/estorno`
    );
    return data;
  },

  async removerLancamento(id: string | number, payload: RemocaoLancamentoFinanceiroPayload) {
    await httpClient.delete(`${baseUrl}/lancamentos/${id}`, { data: payload });
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

  async listarTransferencias() {
    const { data } = await httpClient.get<TransferenciaFinanceira[]>(`${baseUrl}/transferencias`);
    return data;
  },

  async criarTransferencia(payload: TransferenciaFinanceiraPayload) {
    const { data } = await httpClient.post<TransferenciaFinanceira>(
      `${baseUrl}/transferencias`,
      payload
    );
    return data;
  },

  async estornarTransferencia(id: string | number) {
    const { data } = await httpClient.patch<TransferenciaFinanceira>(
      `${baseUrl}/transferencias/${id}/estorno`
    );
    return data;
  },

  async listarConciliacoes() {
    const { data } = await httpClient.get<ConciliacaoFinanceira[]>(`${baseUrl}/conciliacoes`);
    return data;
  },

  async criarConciliacao(payload: ConciliacaoFinanceiraPayload) {
    const { data } = await httpClient.post<ConciliacaoFinanceira>(`${baseUrl}/conciliacoes`, payload);
    return data;
  },

  async atualizarSituacaoConciliacao(id: string | number, situacao: string) {
    const { data } = await httpClient.patch<ConciliacaoFinanceira>(
      `${baseUrl}/conciliacoes/${id}/situacao`,
      { situacao }
    );
    return data;
  },

  async listarHistorico() {
    const { data } = await httpClient.get<HistoricoContabilidade[]>(`${baseUrl}/historico`);
    return data;
  },

  async listarFechamentosMensais() {
    const { data } = await httpClient.get<FechamentoMensal[]>(`${baseUrl}/fechamentos-mensais`);
    return data;
  },

  async fecharMes(payload: FechamentoMensalPayload) {
    const { data } = await httpClient.post<FechamentoMensal>(`${baseUrl}/fechar-mes`, payload);
    return data;
  },

  async listarComprasIntegradas() {
    const { data } = await httpClient.get<CompraIntegradaFinanceira[]>(`${baseUrl}/compras-integradas`);
    return data;
  },

  async gerarObrigacaoFinanceiraPorCompra(compraId: string | number) {
    const { data } = await httpClient.post<LancamentoFinanceiro>(
      `${baseUrl}/compras-integradas/${compraId}/gerar-obrigacao`
    );
    return data;
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
