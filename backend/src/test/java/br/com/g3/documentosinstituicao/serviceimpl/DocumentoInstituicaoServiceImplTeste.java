package br.com.g3.documentosinstituicao.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import br.com.g3.documentosinstituicao.domain.DocumentoInstituicao;
import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoAnexo;
import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoHistorico;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoRequest;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoAnexoRepository;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoHistoricoRepository;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoRepository;
import br.com.g3.documentosinstituicao.service.ArmazenamentoDocumentoInstituicaoAnexoService;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class DocumentoInstituicaoServiceImplTeste {
  @Mock
  private DocumentoInstituicaoRepository repository;

  @Mock
  private DocumentoInstituicaoAnexoRepository anexoRepository;

  @Mock
  private DocumentoInstituicaoHistoricoRepository historicoRepository;

  @Mock
  private ArmazenamentoDocumentoInstituicaoAnexoService armazenamentoService;

  @InjectMocks
  private DocumentoInstituicaoServiceImpl service;

  @Test
  void criarDeveCalcularSituacaoComoVenceEmBreve() {
    DocumentoInstituicaoRequest request = new DocumentoInstituicaoRequest();
    request.setTipoDocumento("Certidao");
    request.setOrgaoEmissor("Orgao");
    request.setEmissao(LocalDate.now());
    request.setValidade(LocalDate.now().plusDays(10));
    request.setSemVencimento(false);
    request.setEmRenovacao(false);

    when(repository.salvar(any(DocumentoInstituicao.class)))
        .thenAnswer(
            invocation -> {
              DocumentoInstituicao documento = invocation.getArgument(0);
              documento.setId(1L);
              return documento;
            });
    when(historicoRepository.salvar(any(DocumentoInstituicaoHistorico.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    String situacao = service.criar(request).getSituacao();

    assertEquals("vence_em_breve", situacao);
  }

  @Test
  void criarDeveRetornarErroQuandoValidadeAnteriorEmissao() {
    DocumentoInstituicaoRequest request = new DocumentoInstituicaoRequest();
    request.setTipoDocumento("Certidao");
    request.setOrgaoEmissor("Orgao");
    request.setEmissao(LocalDate.of(2025, 1, 10));
    request.setValidade(LocalDate.of(2025, 1, 1));
    request.setSemVencimento(false);

    ResponseStatusException erro =
        assertThrows(ResponseStatusException.class, () -> service.criar(request));

    assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
  }

  @Test
  void adicionarAnexoDeveSalvarRegistroQuandoRecebeConteudoBase64() {
    DocumentoInstituicao documento = new DocumentoInstituicao();
    documento.setId(10L);

    DocumentoInstituicaoAnexoRequest request = new DocumentoInstituicaoAnexoRequest();
    request.setNomeArquivo("comprovante.pdf");
    request.setTipo("PDF");
    request.setTipoMime("application/pdf");
    request.setConteudoBase64("Y29udGV1ZG8=");
    request.setUsuario("Adriano");
    request.setDataUpload(LocalDate.of(2026, 4, 16));
    request.setTamanho("1 KB");

    when(repository.buscarPorId(10L)).thenReturn(java.util.Optional.of(documento));
    when(armazenamentoService.salvarArquivo(10L, request))
        .thenReturn("storage/documentos-instituicao/10/arquivo.pdf");
    when(anexoRepository.salvar(any(DocumentoInstituicaoAnexo.class)))
        .thenAnswer(
            invocation -> {
              DocumentoInstituicaoAnexo anexo = invocation.getArgument(0);
              anexo.setId(22L);
              return anexo;
            });
    when(repository.salvar(any(DocumentoInstituicao.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
    when(historicoRepository.salvar(any(DocumentoInstituicaoHistorico.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.adicionarAnexo(10L, request);

    assertEquals("comprovante.pdf", response.getNomeArquivo());
    assertEquals("/api/documentos-instituicao/10/anexos/22/arquivo", response.getArquivoUrl());
  }
}
