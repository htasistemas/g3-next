package br.com.g3.rh.serviceimpl;

import br.com.g3.auditoria.service.AuditoriaService;
import br.com.g3.rh.domain.RhConfiguracaoPonto;
import br.com.g3.rh.domain.RhPontoDia;
import br.com.g3.rh.dto.RhPontoBaterRequest;
import br.com.g3.rh.dto.RhPontoDiaResponse;
import br.com.g3.rh.repository.RhConfiguracaoPontoRepository;
import br.com.g3.rh.repository.RhPontoAuditoriaRepository;
import br.com.g3.rh.repository.RhPontoDiaRepository;
import br.com.g3.rh.repository.RhPontoMarcacaoRepository;
import br.com.g3.rh.service.PontoNetworkValidator;
import br.com.g3.rh.service.ResultadoValidacaoPonto;
import br.com.g3.unidadeassistencial.dto.UnidadeAssistencialResponse;
import br.com.g3.unidadeassistencial.service.UnidadeAssistencialService;
import br.com.g3.usuario.domain.Usuario;
import br.com.g3.usuario.repository.UsuarioRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
public class RhPontoServiceImplTeste {
  @Mock private RhConfiguracaoPontoRepository configuracaoRepository;
  @Mock private RhPontoDiaRepository pontoDiaRepository;
  @Mock private RhPontoMarcacaoRepository marcacaoRepository;
  @Mock private RhPontoAuditoriaRepository auditoriaRepository;
  @Mock private UsuarioRepository usuarioRepository;
  @Mock private UnidadeAssistencialService unidadeAssistencialService;
  @Mock private PontoNetworkValidator pontoNetworkValidator;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private AuditoriaService auditoriaService;

  @InjectMocks private RhPontoServiceImpl service;

  private RhConfiguracaoPonto configuracao;
  private Usuario usuario;
  private UnidadeAssistencialResponse unidadeResponse;

  @BeforeEach
  void setup() {
    configuracao = new RhConfiguracaoPonto();
    configuracao.setId(1L);
    configuracao.setCargaSegQuiMinutos(540);
    configuracao.setCargaSextaMinutos(240);
    configuracao.setCargaSabadoMinutos(0);
    configuracao.setCargaDomingoMinutos(0);
    configuracao.setCargaSemanalMinutos(2400);
    configuracao.setToleranciaMinutos(10);
    configuracao.setAtualizadoEm(LocalDateTime.now());

    usuario = new Usuario();
    usuario.setId(10L);
    usuario.setSenhaHash("hash");

    unidadeResponse = new UnidadeAssistencialResponse(
        1L,
        "Sede",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        true,
        null,
        null,
        "Rua A",
        "100",
        null,
        null,
        null,
        "Cidade",
        null,
        null,
        "MG",
        "-19.9",
        "-43.9",
        100,
        80,
        null,
        "200.150.10.20",
        "192.168.0.0/24",
        "IP_OU_REDE",
        2000);

    Mockito.when(pontoNetworkValidator.validarAutorizacao(
            ArgumentMatchers.any(),
            ArgumentMatchers.any(),
            ArgumentMatchers.any()))
        .thenReturn(new ResultadoValidacaoPonto(true, null));
  }

  @Test
  void baterPonto_deveNegarQuandoSenhaInvalida() {
    RhPontoBaterRequest request = new RhPontoBaterRequest();
    request.setFuncionarioId(10L);
    request.setTipo("E1");
    request.setSenha("errada");
    request.setLatitude(-19.9);
    request.setLongitude(-43.9);
    request.setAccuracy(10.0);

    Mockito.when(usuarioRepository.buscarPorId(10L)).thenReturn(Optional.of(usuario));
    Mockito.when(passwordEncoder.matches(ArgumentMatchers.any(), ArgumentMatchers.any())).thenReturn(false);
    Mockito.when(unidadeAssistencialService.obterAtual()).thenReturn(unidadeResponse);
    Mockito.when(configuracaoRepository.buscarAtual()).thenReturn(Optional.of(configuracao));

    ResponseStatusException ex = Assertions.assertThrows(
        ResponseStatusException.class,
        () -> service.baterPonto(request, 10L, "127.0.0.1", "tester"));

    Assertions.assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    Mockito.verify(auditoriaRepository, Mockito.times(1)).salvar(ArgumentMatchers.any());
  }

  @Test
  void baterPonto_deveValidarSequencia() {
    RhPontoBaterRequest request = new RhPontoBaterRequest();
    request.setFuncionarioId(10L);
    request.setTipo("S1");
    request.setSenha("ok");
    request.setLatitude(-19.9);
    request.setLongitude(-43.9);
    request.setAccuracy(10.0);

    Mockito.when(usuarioRepository.buscarPorId(10L)).thenReturn(Optional.of(usuario));
    Mockito.when(passwordEncoder.matches(ArgumentMatchers.any(), ArgumentMatchers.any())).thenReturn(true);
    Mockito.when(unidadeAssistencialService.obterAtual()).thenReturn(unidadeResponse);
    Mockito.when(configuracaoRepository.buscarAtual()).thenReturn(Optional.of(configuracao));

    RhPontoDia pontoDia = new RhPontoDia();
    pontoDia.setId(1L);
    pontoDia.setFuncionarioId(10L);
    pontoDia.setData(LocalDate.now());
    pontoDia.setOcorrencia("NORMAL");
    pontoDia.setCargaPrevistaMinutos(540);
    pontoDia.setToleranciaMinutos(10);
    pontoDia.setTotalTrabalhadoMinutos(0);
    pontoDia.setExtrasMinutos(0);
    pontoDia.setFaltasAtrasosMinutos(0);
    pontoDia.setCriadoEm(LocalDateTime.now());
    pontoDia.setAtualizadoEm(LocalDateTime.now());

    Mockito.when(pontoDiaRepository.buscarPorFuncionarioEData(10L, LocalDate.now()))
        .thenReturn(Optional.of(pontoDia));

    ResponseStatusException ex = Assertions.assertThrows(
        ResponseStatusException.class,
        () -> service.baterPonto(request, 10L, "127.0.0.1", "tester"));

    Assertions.assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
  }

  @Test
  void baterPonto_deveBloquearQuandoValidacaoNegar() {
    RhPontoBaterRequest request = new RhPontoBaterRequest();
    request.setFuncionarioId(10L);
    request.setTipo("E1");
    request.setSenha("ok");

    Mockito.when(unidadeAssistencialService.obterAtual()).thenReturn(unidadeResponse);
    Mockito.when(configuracaoRepository.buscarAtual()).thenReturn(Optional.of(configuracao));
    Mockito.when(pontoNetworkValidator.validarAutorizacao(
            ArgumentMatchers.any(),
            ArgumentMatchers.any(),
            ArgumentMatchers.any()))
        .thenReturn(new ResultadoValidacaoPonto(false, "Você precisa estar na instituição para registrar o ponto."));

    ResponseStatusException ex = Assertions.assertThrows(
        ResponseStatusException.class,
        () -> service.baterPonto(request, 10L, "200.150.10.20", "Mozilla/5.0"));

    Assertions.assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    Mockito.verify(auditoriaRepository, Mockito.times(1)).salvar(ArgumentMatchers.any());
    Mockito.verify(usuarioRepository, Mockito.never()).buscarPorId(ArgumentMatchers.any());
  }

  @Test
  void baterPonto_deveRegistrarQuandoIpPermitido() {
    RhPontoBaterRequest request = new RhPontoBaterRequest();
    request.setFuncionarioId(10L);
    request.setTipo("E1");
    request.setSenha("ok");

    Mockito.when(usuarioRepository.buscarPorId(10L)).thenReturn(Optional.of(usuario));
    Mockito.when(passwordEncoder.matches(ArgumentMatchers.any(), ArgumentMatchers.any())).thenReturn(true);
    Mockito.when(unidadeAssistencialService.obterAtual()).thenReturn(unidadeResponse);
    Mockito.when(configuracaoRepository.buscarAtual()).thenReturn(Optional.of(configuracao));
    Mockito.when(pontoDiaRepository.buscarPorFuncionarioEData(10L, LocalDate.now()))
        .thenReturn(Optional.empty());
    Mockito.when(pontoDiaRepository.salvar(ArgumentMatchers.any())).thenAnswer(invocation -> {
      RhPontoDia dia = invocation.getArgument(0);
      if (dia.getId() == null) {
        dia.setId(1L);
      }
      return dia;
    });
    Mockito.when(marcacaoRepository.salvar(ArgumentMatchers.any())).thenAnswer(invocation -> {
      var marcacao = invocation.getArgument(0, br.com.g3.rh.domain.RhPontoMarcacao.class);
      marcacao.setId(5L);
      return marcacao;
    });

    RhPontoDiaResponse response = service.baterPonto(request, 10L, "200.150.10.20", "Mozilla/5.0");

    Assertions.assertNotNull(response);
    Assertions.assertEquals(1, response.getMarcacoes().size());
    Mockito.verify(auditoriaRepository, Mockito.atLeastOnce()).salvar(ArgumentMatchers.any());
  }
}
