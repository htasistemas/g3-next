package br.com.g3.documentosinstituicao.controller;

import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoResponse;
import br.com.g3.documentosinstituicao.service.DocumentoInstituicaoService;
import jakarta.validation.Valid;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/documentos-instituicao")
public class DocumentoInstituicaoController {
  private final DocumentoInstituicaoService service;

  public DocumentoInstituicaoController(DocumentoInstituicaoService service) {
    this.service = service;
  }

  @GetMapping
  public ResponseEntity<List<DocumentoInstituicaoResponse>> listar() {
    return ResponseEntity.ok(service.listar());
  }

  @PostMapping
  public ResponseEntity<DocumentoInstituicaoResponse> criar(@Valid @RequestBody DocumentoInstituicaoRequest request) {
    return ResponseEntity.ok(service.criar(request));
  }

  @PutMapping("/{id}")
  public ResponseEntity<DocumentoInstituicaoResponse> atualizar(
      @PathVariable("id") Long id, @Valid @RequestBody DocumentoInstituicaoRequest request) {
    return ResponseEntity.ok(service.atualizar(id, request));
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> excluir(@PathVariable("id") Long id) {
    service.excluir(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/anexos")
  public ResponseEntity<List<DocumentoInstituicaoAnexoResponse>> listarAnexos(@PathVariable("id") Long id) {
    return ResponseEntity.ok(service.listarAnexos(id));
  }

  @PostMapping("/{id}/anexos")
  public ResponseEntity<DocumentoInstituicaoAnexoResponse> adicionarAnexo(
      @PathVariable("id") Long id, @Valid @RequestBody DocumentoInstituicaoAnexoRequest request) {
    return ResponseEntity.ok(service.adicionarAnexo(id, request));
  }

  @PutMapping("/{id}/anexos/{anexoId}")
  public ResponseEntity<DocumentoInstituicaoAnexoResponse> substituirAnexo(
      @PathVariable("id") Long id,
      @PathVariable("anexoId") Long anexoId,
      @Valid @RequestBody DocumentoInstituicaoAnexoRequest request) {
    return ResponseEntity.ok(service.substituirAnexo(id, anexoId, request));
  }

  @DeleteMapping("/{id}/anexos/{anexoId}")
  public ResponseEntity<Void> excluirAnexo(
      @PathVariable("id") Long id, @PathVariable("anexoId") Long anexoId) {
    service.excluirAnexo(id, anexoId);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/{id}/anexos/{anexoId}/arquivo")
  public ResponseEntity<Resource> baixarAnexo(
      @PathVariable("id") Long id, @PathVariable("anexoId") Long anexoId) {
    Resource resource = service.obterArquivoAnexo(id, anexoId);
    return ResponseEntity.ok()
        .contentType(obterMediaType(resource))
        .body(resource);
  }

  @GetMapping("/{id}/historico")
  public ResponseEntity<List<DocumentoInstituicaoHistoricoResponse>> listarHistorico(@PathVariable("id") Long id) {
    return ResponseEntity.ok(service.listarHistorico(id));
  }

  @PostMapping("/{id}/historico")
  public ResponseEntity<DocumentoInstituicaoHistoricoResponse> adicionarHistorico(
      @PathVariable("id") Long id, @Valid @RequestBody DocumentoInstituicaoHistoricoRequest request) {
    return ResponseEntity.ok(service.adicionarHistorico(id, request));
  }

  private MediaType obterMediaType(Resource resource) {
    try {
      Path caminho = Paths.get(resource.getFile().getAbsolutePath());
      String contentType = Files.probeContentType(caminho);
      return contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
    } catch (Exception ex) {
      return MediaType.APPLICATION_OCTET_STREAM;
    }
  }
}
