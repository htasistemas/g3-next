package br.com.g3.contabilidade.service;

import br.com.g3.contabilidade.dto.ContaBancariaRequest;
import br.com.g3.contabilidade.dto.ContaBancariaResponse;
import br.com.g3.contabilidade.dto.EmendaImpositivaRequest;
import br.com.g3.contabilidade.dto.EmendaImpositivaResponse;
import br.com.g3.contabilidade.dto.LancamentoFinanceiroRequest;
import br.com.g3.contabilidade.dto.LancamentoFinanceiroResponse;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraRequest;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraResponse;
import br.com.g3.contabilidade.dto.PagamentoLancamentoRequest;
import br.com.g3.contabilidade.dto.ReciboPagamentoResponse;
import java.util.List;

public interface ContabilidadeService {
  ContaBancariaResponse criarContaBancaria(ContaBancariaRequest request);

  List<ContaBancariaResponse> listarContasBancarias();

  ContaBancariaResponse atualizarContaBancaria(Long id, ContaBancariaRequest request);

  void removerContaBancaria(Long id);

  LancamentoFinanceiroResponse criarLancamento(LancamentoFinanceiroRequest request);

  LancamentoFinanceiroResponse atualizarLancamento(Long id, LancamentoFinanceiroRequest request);

  List<LancamentoFinanceiroResponse> listarLancamentos();

  LancamentoFinanceiroResponse atualizarSituacaoLancamento(Long id, String status);

  LancamentoFinanceiroResponse estornarLancamento(Long id);

  void removerLancamento(Long id);

  ReciboPagamentoResponse pagarLancamento(Long id, PagamentoLancamentoRequest request);

  MovimentacaoFinanceiraResponse criarMovimentacao(MovimentacaoFinanceiraRequest request);

  MovimentacaoFinanceiraResponse atualizarMovimentacao(Long id, MovimentacaoFinanceiraRequest request);

  List<MovimentacaoFinanceiraResponse> listarMovimentacoes();

  void removerMovimentacao(Long id);

  EmendaImpositivaResponse criarEmenda(EmendaImpositivaRequest request);

  List<EmendaImpositivaResponse> listarEmendas();

  EmendaImpositivaResponse atualizarStatusEmenda(Long id, String status);
}
