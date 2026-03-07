package br.com.g3.vinculofamiliar.controller;

import br.com.g3.vinculofamiliar.dto.VinculoFamiliarConsultaResponse;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarCriacaoRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarListaResponse;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarMembroRequest;
import br.com.g3.vinculofamiliar.dto.VinculoFamiliarResponse;
import br.com.g3.vinculofamiliar.service.VinculoFamiliarService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/familias")
public class VinculoFamiliarController {
  private final VinculoFamiliarService service;

  public VinculoFamiliarController(VinculoFamiliarService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VinculoFamiliarConsultaResponse criar(@Valid @RequestBody VinculoFamiliarCriacaoRequest request) {
    VinculoFamiliarResponse response = service.criar(request);
    return new VinculoFamiliarConsultaResponse(response);
  }

  @PutMapping("/{id}")
  public VinculoFamiliarConsultaResponse atualizar(
      @PathVariable("id") Long id, @Valid @RequestBody VinculoFamiliarCriacaoRequest request) {
    VinculoFamiliarResponse response = service.atualizar(id, request);
    return new VinculoFamiliarConsultaResponse(response);
  }

  @GetMapping("/{id}")
  public VinculoFamiliarConsultaResponse buscarPorId(@PathVariable("id") Long id) {
    return new VinculoFamiliarConsultaResponse(service.buscarPorId(id));
  }

  @GetMapping
  public VinculoFamiliarListaResponse listar(
      @RequestParam(value = "nome_familia", required = false) String nomeFamilia,
      @RequestParam(value = "municipio", required = false) String municipio,
      @RequestParam(value = "referencia", required = false) String referencia) {
    List<VinculoFamiliarResponse> familias = service.listar(nomeFamilia, municipio, referencia);
    return new VinculoFamiliarListaResponse(familias);
  }

  @PostMapping("/{id}/membros")
  public VinculoFamiliarConsultaResponse adicionarMembro(
      @PathVariable("id") Long id, @Valid @RequestBody VinculoFamiliarMembroRequest request) {
    VinculoFamiliarResponse response = service.adicionarMembro(id, request);
    return new VinculoFamiliarConsultaResponse(response);
  }

  @PutMapping("/{id}/membros/{membroId}")
  public VinculoFamiliarConsultaResponse atualizarMembro(
      @PathVariable("id") Long id,
      @PathVariable("membroId") Long membroId,
      @Valid @RequestBody VinculoFamiliarMembroRequest request) {
    VinculoFamiliarResponse response = service.atualizarMembro(id, membroId, request);
    return new VinculoFamiliarConsultaResponse(response);
  }

  @DeleteMapping("/{id}/membros/{membroId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removerMembro(@PathVariable("id") Long id, @PathVariable("membroId") Long membroId) {
    service.removerMembro(id, membroId);
  }
}
