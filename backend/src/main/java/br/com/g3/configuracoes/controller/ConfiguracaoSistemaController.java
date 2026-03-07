package br.com.g3.configuracoes.controller;

import br.com.g3.configuracoes.dto.AtualizarVersaoRequest;
import br.com.g3.configuracoes.dto.BeneficiarioDocumentoConfigListaRequest;
import br.com.g3.configuracoes.dto.BeneficiarioDocumentoConfigListaResponse;
import br.com.g3.configuracoes.dto.DestinoChamadoResponse;
import br.com.g3.configuracoes.dto.HistoricoVersaoResponse;
import br.com.g3.configuracoes.dto.VersaoSistemaResponse;
import br.com.g3.configuracoes.service.ConfiguracaoSistemaService;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
public class ConfiguracaoSistemaController {
  private final ConfiguracaoSistemaService service;

  public ConfiguracaoSistemaController(ConfiguracaoSistemaService service) {
    this.service = service;
  }

  @GetMapping("/versao")
  public VersaoSistemaResponse obterVersaoAtual() {
    return service.obterVersaoAtual();
  }

  @GetMapping("/beneficiary-documents")
  public BeneficiarioDocumentoConfigListaResponse listarDocumentosBeneficiario() {
    return new BeneficiarioDocumentoConfigListaResponse(service.listarDocumentosBeneficiario());
  }

  @PutMapping("/beneficiary-documents")
  public BeneficiarioDocumentoConfigListaResponse atualizarDocumentosBeneficiario(
      @RequestBody BeneficiarioDocumentoConfigListaRequest request) {
    return new BeneficiarioDocumentoConfigListaResponse(
        service.atualizarDocumentosBeneficiario(request == null ? null : request.getDocuments()));
  }

  @GetMapping(value = "/versao/arquivo", produces = MediaType.TEXT_PLAIN_VALUE)
  public ResponseEntity<String> obterVersaoArquivo() {
    String versao = service.obterVersaoArquivo();
    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(versao == null ? "" : versao);
  }

  @PutMapping("/versao")
  public VersaoSistemaResponse atualizarVersao(@RequestBody AtualizarVersaoRequest request) {
    return service.atualizarVersao(request);
  }

  @GetMapping("/versao/historico")
  public List<HistoricoVersaoResponse> listarHistorico() {
    return service.listarHistorico();
  }

  @GetMapping("/chamados/destino")
  public DestinoChamadoResponse obterDestinoChamados() {
    return service.obterDestinoChamados();
  }
}
