package br.com.g3.manualsistema.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.g3.manualsistema.domain.ManualSistemaMudanca;
import br.com.g3.manualsistema.domain.ManualSistemaSecao;
import br.com.g3.manualsistema.dto.ManualSistemaMudancaRequest;
import br.com.g3.manualsistema.dto.ManualSistemaResumoResponse;
import br.com.g3.manualsistema.repository.ManualSistemaMudancaRepository;
import br.com.g3.manualsistema.repository.ManualSistemaSecaoRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManualSistemaServiceImplTeste {
  @Mock
  private ManualSistemaSecaoRepository secaoRepository;

  @Mock
  private ManualSistemaMudancaRepository mudancaRepository;

  @InjectMocks
  private ManualSistemaServiceImpl service;

  @Test
  void devePriorizarUltimaMudancaNoResumo() {
    ManualSistemaSecao secao = new ManualSistemaSecao();
    secao.setSlug("introducao");
    secao.setTitulo("Introducao");
    secao.setAtualizadoEm(LocalDateTime.of(2026, 2, 20, 10, 0));

    when(secaoRepository.listarOrdenado()).thenReturn(List.of(secao));
    when(mudancaRepository.buscarUltimaMudanca())
        .thenReturn(Optional.of(LocalDateTime.of(2026, 2, 24, 18, 0)));

    ManualSistemaResumoResponse resumo = service.obterResumo();

    assertEquals(1, resumo.getSecoes().size());
    assertEquals(LocalDateTime.of(2026, 2, 24, 18, 0), resumo.getUltimaAtualizacao());
  }

  @Test
  void registrarMudancaAtualizaChangelogESecaoTela() {
    ManualSistemaMudancaRequest request = new ManualSistemaMudancaRequest();
    request.setAutor("Sistema");
    request.setModulo("Cadastros");
    request.setTela("Cadastro de Profissionais");
    request.setTipo("ajuste");
    request.setDescricaoCurta("Atualizacao de status");

    when(mudancaRepository.salvar(any(ManualSistemaMudanca.class)))
        .thenAnswer(invocation -> {
          ManualSistemaMudanca mudanca = invocation.getArgument(0);
          mudanca.setId(1L);
          return mudanca;
        });
    when(mudancaRepository.listarRecentes(anyInt())).thenReturn(List.of(new ManualSistemaMudanca()));
    when(secaoRepository.buscarPorSlug(any())).thenReturn(Optional.empty());

    service.registrarMudanca(request);

    verify(secaoRepository, times(2)).salvar(any(ManualSistemaSecao.class));
  }
}
