package br.com.g3.recebimentodoacao.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.g3.auditoria.service.AuditoriaService;
import br.com.g3.almoxarifado.domain.AlmoxarifadoItem;
import br.com.g3.almoxarifado.domain.AlmoxarifadoMovimentacao;
import br.com.g3.almoxarifado.repository.AlmoxarifadoRepository;
import br.com.g3.contabilidade.domain.ContaBancaria;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraRequest;
import br.com.g3.contabilidade.repository.ContaBancariaRepository;
import br.com.g3.contabilidade.repository.MovimentacaoFinanceiraRepository;
import br.com.g3.contabilidade.service.ContabilidadeService;
import br.com.g3.patrimonio.domain.PatrimonioItem;
import br.com.g3.patrimonio.repository.PatrimonioRepository;
import br.com.g3.recebimentodoacao.domain.RecebimentoDoacao;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoItemRequest;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoRequest;
import br.com.g3.recebimentodoacao.repository.DoadorRepository;
import br.com.g3.recebimentodoacao.repository.RecebimentoDoacaoRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecebimentoDoacaoServiceImplTeste {
  @Mock
  private DoadorRepository doadorRepository;

  @Mock
  private RecebimentoDoacaoRepository recebimentoRepository;

  @Mock
  private ContabilidadeService contabilidadeService;

  @Mock
  private ContaBancariaRepository contaBancariaRepository;

  @Mock
  private MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;

  @Mock
  private AlmoxarifadoRepository almoxarifadoRepository;

  @Mock
  private PatrimonioRepository patrimonioRepository;

  @Mock
  private AuditoriaService auditoriaService;

  @InjectMocks
  private RecebimentoDoacaoServiceImpl service;

  @Test
  void criarRecebimentoDinheiroDeveGerarMovimentacaoFinanceira() {
    RecebimentoDoacaoRequest request = new RecebimentoDoacaoRequest();
    request.setTipoDoacao("Dinheiro");
    request.setStatus("RECEBIDA");
    request.setDataRecebimento(LocalDate.of(2026, 2, 10));
    request.setValor(new BigDecimal("250.00"));
    request.setDescricao("Doacao em dinheiro");

    ContaBancaria conta = new ContaBancaria();
    conta.setId(99L);
    when(contaBancariaRepository.listarRecebimentoLocal()).thenReturn(List.of(conta));
    when(movimentacaoFinanceiraRepository.existePorDoacaoId(any())).thenReturn(false);
    when(almoxarifadoRepository.existeMovimentacaoPorDoacaoId(any())).thenReturn(false);
    when(patrimonioRepository.existePorDoacaoId(any())).thenReturn(false);

    when(recebimentoRepository.salvar(any())).thenAnswer(invocation -> {
      RecebimentoDoacao recebimento = invocation.getArgument(0);
      recebimento.setId(1L);
      return recebimento;
    });

    service.criarRecebimento(request);

    ArgumentCaptor<MovimentacaoFinanceiraRequest> captor =
        ArgumentCaptor.forClass(MovimentacaoFinanceiraRequest.class);
    verify(contabilidadeService).criarMovimentacao(captor.capture());
    MovimentacaoFinanceiraRequest movimento = captor.getValue();
    assertEquals("Entrada", movimento.getTipo());
    assertEquals(1L, movimento.getDoacaoId());
    assertEquals(99L, movimento.getContaBancariaId());
  }

  @Test
  void criarRecebimentoItensDeveGerarEntradaAlmoxarifado() {
    RecebimentoDoacaoRequest request = new RecebimentoDoacaoRequest();
    request.setTipoDoacao("Alimentos");
    request.setStatus("RECEBIDA");
    request.setDataRecebimento(LocalDate.of(2026, 2, 10));
    request.setDescricao("Arroz");
    request.setQuantidadeItens(2);
    request.setValorMedio(new BigDecimal("10.00"));

    when(movimentacaoFinanceiraRepository.existePorDoacaoId(any())).thenReturn(false);
    when(almoxarifadoRepository.existeMovimentacaoPorDoacaoId(any())).thenReturn(false);
    when(patrimonioRepository.existePorDoacaoId(any())).thenReturn(false);
    when(almoxarifadoRepository.buscarItemDuplicado(any(), any(), any(), any(), any()))
        .thenReturn(Optional.empty());
    when(almoxarifadoRepository.obterProximoCodigo()).thenReturn(1);

    when(recebimentoRepository.salvar(any())).thenAnswer(invocation -> {
      RecebimentoDoacao recebimento = invocation.getArgument(0);
      recebimento.setId(2L);
      return recebimento;
    });

    when(almoxarifadoRepository.salvarItem(any(AlmoxarifadoItem.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.criarRecebimento(request);

    verify(almoxarifadoRepository, times(1)).salvarMovimentacao(any(AlmoxarifadoMovimentacao.class));
  }

  @Test
  void criarRecebimentoBensDeveGerarPatrimonio() {
    RecebimentoDoacaoRequest request = new RecebimentoDoacaoRequest();
    request.setTipoDoacao("Bens");
    request.setStatus("RECEBIDA");
    request.setDataRecebimento(LocalDate.of(2026, 2, 10));

    RecebimentoDoacaoItemRequest item = new RecebimentoDoacaoItemRequest();
    item.setDescricao("Notebook");
    item.setQuantidade(2);
    request.setItens(List.of(item));

    when(movimentacaoFinanceiraRepository.existePorDoacaoId(any())).thenReturn(false);
    when(almoxarifadoRepository.existeMovimentacaoPorDoacaoId(any())).thenReturn(false);
    when(patrimonioRepository.existePorDoacaoId(any())).thenReturn(false);

    when(recebimentoRepository.salvar(any())).thenAnswer(invocation -> {
      RecebimentoDoacao recebimento = invocation.getArgument(0);
      recebimento.setId(3L);
      return recebimento;
    });

    when(patrimonioRepository.salvar(any(PatrimonioItem.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.criarRecebimento(request);

    verify(patrimonioRepository, times(2)).salvar(any(PatrimonioItem.class));
  }

  @Test
  void naoDeveGerarLancamentosQuandoJaGerado() {
    RecebimentoDoacaoRequest request = new RecebimentoDoacaoRequest();
    request.setTipoDoacao("Dinheiro");
    request.setStatus("RECEBIDA");
    request.setDataRecebimento(LocalDate.of(2026, 2, 10));
    request.setValor(new BigDecimal("50.00"));

    when(recebimentoRepository.salvar(any())).thenAnswer(invocation -> {
      RecebimentoDoacao recebimento = invocation.getArgument(0);
      recebimento.setId(4L);
      recebimento.setLancamentosGerados(true);
      return recebimento;
    });

    service.criarRecebimento(request);

    verify(contabilidadeService, never()).criarMovimentacao(any());
  }
}
