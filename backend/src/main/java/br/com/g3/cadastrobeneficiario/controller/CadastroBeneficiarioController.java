package br.com.g3.cadastrobeneficiario.controller;

import br.com.g3.cadastrobeneficiario.domain.DocumentoBeneficiario;
import br.com.g3.cadastrobeneficiario.dto.AptidaoCestaBasicaRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioCodigoResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioConsultaResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioCriacaoRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioListaResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResumoListaResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResumoResponse;
import br.com.g3.cadastrobeneficiario.service.CadastroBeneficiarioService;
import jakarta.validation.Valid;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/beneficiarios")
public class CadastroBeneficiarioController {
  private final CadastroBeneficiarioService service;

  public CadastroBeneficiarioController(CadastroBeneficiarioService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CadastroBeneficiarioConsultaResponse criar(@Valid @RequestBody CadastroBeneficiarioCriacaoRequest request) {
    CadastroBeneficiarioResponse response = service.criar(request);
    return new CadastroBeneficiarioConsultaResponse(response);
  }

  @PutMapping("/{id}")
  public CadastroBeneficiarioConsultaResponse atualizar(
      @PathVariable("id") Long id, @Valid @RequestBody CadastroBeneficiarioCriacaoRequest request) {
    CadastroBeneficiarioResponse response = service.atualizar(id, request);
    return new CadastroBeneficiarioConsultaResponse(response);
  }

  @GetMapping("/{id:\\d+}")
  public CadastroBeneficiarioConsultaResponse buscarPorId(@PathVariable("id") Long id) {
    return new CadastroBeneficiarioConsultaResponse(service.buscarPorId(id));
  }

  @GetMapping("/{id}/documentos/{documentoId}")
  public ResponseEntity<Resource> baixarDocumento(
      @PathVariable("id") Long id, @PathVariable("documentoId") Long documentoId) {
    DocumentoBeneficiario documento = service.obterDocumento(id, documentoId);
    if (documento.getCaminhoArquivo() == null) {
      return ResponseEntity.notFound().build();
    }

    Path caminho = java.nio.file.Paths.get(documento.getCaminhoArquivo());
    if (!Files.exists(caminho)) {
      return ResponseEntity.notFound().build();
    }

    String contentType =
        documento.getContentType() != null ? documento.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

    Resource resource = new FileSystemResource(caminho);
    return ResponseEntity.ok()
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"" + (documento.getNomeArquivo() != null ? documento.getNomeArquivo() : "documento") + "\"")
        .contentType(MediaType.parseMediaType(contentType))
        .body(resource);
  }

  @GetMapping
  public CadastroBeneficiarioListaResponse listar(
      @RequestParam(value = "nome", required = false) String nome,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "codigo", required = false) String codigo,
      @RequestParam(value = "cpf", required = false) String cpf,
      @RequestParam(value = "nis", required = false) String nis,
      @RequestParam(value = "data_nascimento", required = false) String dataNascimento) {
    List<CadastroBeneficiarioResponse> beneficiarios =
        service.listar(nome, status, codigo, cpf, nis, dataNascimento);
    return new CadastroBeneficiarioListaResponse(beneficiarios);
  }

  @GetMapping("/proximo-codigo")
  public CadastroBeneficiarioCodigoResponse obterProximoCodigo() {
    return new CadastroBeneficiarioCodigoResponse(service.obterProximoCodigo());
  }

  @GetMapping("/resumo")
  public CadastroBeneficiarioResumoListaResponse listarResumo(
      @RequestParam(value = "nome", required = false) String nome,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "codigo", required = false) String codigo,
      @RequestParam(value = "cpf", required = false) String cpf,
      @RequestParam(value = "nis", required = false) String nis,
      @RequestParam(value = "data_nascimento", required = false) String dataNascimento) {
    List<CadastroBeneficiarioResumoResponse> beneficiarios =
        service.listarResumo(nome, status, codigo, cpf, nis, dataNascimento);
    return new CadastroBeneficiarioResumoListaResponse(beneficiarios);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remover(@PathVariable("id") Long id) {
    service.remover(id);
  }

  @PostMapping("/{id}/geocodificar-endereco")
  public CadastroBeneficiarioConsultaResponse geocodificarEndereco(
      @PathVariable("id") Long id, @RequestParam(name = "forcar", defaultValue = "false") boolean forcar) {
    CadastroBeneficiarioResponse response = service.geocodificarEndereco(id, forcar);
    return new CadastroBeneficiarioConsultaResponse(response);
  }
  @PatchMapping("/{id}/aptidao-cesta-basica")
  public CadastroBeneficiarioConsultaResponse atualizarAptidaoCestaBasica(
      @PathVariable("id") Long id, @RequestBody AptidaoCestaBasicaRequest request) {
    CadastroBeneficiarioResponse response = service.atualizarAptidaoCestaBasica(id, request);
    return new CadastroBeneficiarioConsultaResponse(response);
  }
}
