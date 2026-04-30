package br.com.g3.cadastroprofissionais.controller;

import br.com.g3.autenticacao.security.UsuarioAutenticadoUtil;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalConsultaResponse;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalCriacaoRequest;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalListaResponse;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalResponse;
import br.com.g3.cadastroprofissionais.service.CadastroProfissionalService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
@RequestMapping("/api/profissionais")
public class CadastroProfissionalController {
  private final CadastroProfissionalService service;

  public CadastroProfissionalController(CadastroProfissionalService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CadastroProfissionalConsultaResponse criar(
      Authentication authentication, @Valid @RequestBody CadastroProfissionalCriacaoRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    CadastroProfissionalResponse response = service.criar(request, usuarioId);
    return new CadastroProfissionalConsultaResponse(response);
  }

  @PutMapping("/{id}")
  public CadastroProfissionalConsultaResponse atualizar(
      @PathVariable("id") Long id,
      Authentication authentication,
      @Valid @RequestBody CadastroProfissionalCriacaoRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    CadastroProfissionalResponse response = service.atualizar(id, request, usuarioId);
    return new CadastroProfissionalConsultaResponse(response);
  }

  @GetMapping("/{id}")
  public CadastroProfissionalConsultaResponse buscarPorId(
      @PathVariable("id") Long id, Authentication authentication) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return new CadastroProfissionalConsultaResponse(service.buscarPorId(id, usuarioId));
  }

  @GetMapping
  public CadastroProfissionalListaResponse listar(
      Authentication authentication, @RequestParam(value = "nome", required = false) String nome) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    List<CadastroProfissionalResponse> profissionais = service.listar(nome, usuarioId);
    return new CadastroProfissionalListaResponse(profissionais);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remover(@PathVariable("id") Long id, Authentication authentication) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    service.remover(id, usuarioId);
  }
}
