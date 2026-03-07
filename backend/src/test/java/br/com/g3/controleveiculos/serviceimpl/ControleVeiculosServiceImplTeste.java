package br.com.g3.controleveiculos.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.g3.controleveiculos.domain.DiarioBordo;
import br.com.g3.controleveiculos.domain.Veiculo;
import br.com.g3.controleveiculos.dto.DiarioBordoRequest;
import br.com.g3.controleveiculos.dto.DiarioBordoResponse;
import br.com.g3.controleveiculos.dto.VeiculoRequest;
import br.com.g3.controleveiculos.repository.DiarioBordoRepository;
import br.com.g3.controleveiculos.repository.VeiculoRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ControleVeiculosServiceImplTeste {
  @Mock
  private VeiculoRepository veiculoRepository;

  @Mock
  private DiarioBordoRepository diarioBordoRepository;

  @InjectMocks
  private ControleVeiculosServiceImpl servico;

  @Test
  void criarDiarioDeveCalcularKmRodadosEMediaConsumo() {
    DiarioBordoRequest requisicao = new DiarioBordoRequest();
    requisicao.setVeiculoId(1L);
    requisicao.setData(LocalDate.of(2024, 10, 10));
    requisicao.setCondutor("Carlos Silva");
    requisicao.setHorarioSaida(LocalTime.of(8, 0));
    requisicao.setKmInicial(new BigDecimal("1000"));
    requisicao.setHorarioChegada(LocalTime.of(10, 0));
    requisicao.setKmFinal(new BigDecimal("1050"));
    requisicao.setDestino("Centro");
    requisicao.setCombustivelConsumidoLitros(new BigDecimal("5"));

    Veiculo veiculo = new Veiculo();
    veiculo.setId(1L);
    veiculo.setMediaConsumoPadrao(new BigDecimal("10"));
    when(veiculoRepository.buscarPorId(1L)).thenReturn(Optional.of(veiculo));

    when(diarioBordoRepository.salvar(any(DiarioBordo.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    DiarioBordoResponse resposta = servico.criarDiario(requisicao);

    assertEquals(new BigDecimal("50"), resposta.getKmRodados());
    assertEquals(new BigDecimal("10.00"), resposta.getMediaConsumo());
    assertEquals(new BigDecimal("5.00"), resposta.getCombustivelConsumidoLitros());
  }

  @Test
  void criarDiarioDeveRetornarErroQuandoKmFinalMenorQueInicial() {
    DiarioBordoRequest requisicao = new DiarioBordoRequest();
    requisicao.setVeiculoId(1L);
    requisicao.setData(LocalDate.of(2024, 10, 10));
    requisicao.setCondutor("Carlos Silva");
    requisicao.setHorarioSaida(LocalTime.of(8, 0));
    requisicao.setKmInicial(new BigDecimal("1000"));
    requisicao.setHorarioChegada(LocalTime.of(10, 0));
    requisicao.setKmFinal(new BigDecimal("900"));
    requisicao.setDestino("Centro");
    requisicao.setCombustivelConsumidoLitros(new BigDecimal("5"));

    assertThrows(ResponseStatusException.class, () -> servico.criarDiario(requisicao));
  }

  @Test
  void criarDiarioDevePermitirCamposOpcionaisSemMetricas() {
    DiarioBordoRequest requisicao = new DiarioBordoRequest();
    requisicao.setData(LocalDate.of(2024, 10, 10));

    when(diarioBordoRepository.salvar(any(DiarioBordo.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    DiarioBordoResponse resposta = servico.criarDiario(requisicao);

    assertNull(resposta.getKmRodados());
    assertNull(resposta.getMediaConsumo());
    assertNull(resposta.getCombustivelConsumidoLitros());
  }

  @Test
  void criarVeiculoDeveRetornarErroQuandoPlacaInvalida() {
    VeiculoRequest requisicao = new VeiculoRequest();
    requisicao.setPlaca("1234ABC");

    assertThrows(ResponseStatusException.class, () -> servico.criarVeiculo(requisicao));
  }
}
