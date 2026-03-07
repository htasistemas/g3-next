package br.com.g3.usuario.controller;

import br.com.g3.autenticacao.security.UsuarioAutenticadoUtil;
import br.com.g3.usuario.dto.UsuarioAtualizacaoRequest;
import br.com.g3.usuario.dto.UsuarioCriacaoRequest;
import br.com.g3.usuario.dto.UsuarioResponse;
import br.com.g3.usuario.service.UsuarioService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {
  private final UsuarioService service;

  public UsuarioController(UsuarioService service) {
    this.service = service;
  }

  @GetMapping
  public List<UsuarioResponse> listar() {
    return service.listar();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UsuarioResponse criar(
      Authentication authentication,
      @Valid @RequestBody UsuarioCriacaoRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.criar(request, usuarioId);
  }

  @PutMapping("/{id}")
  public UsuarioResponse atualizar(
      @PathVariable("id") Long id,
      Authentication authentication,
      @Valid @RequestBody UsuarioAtualizacaoRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.atualizar(id, request, usuarioId);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remover(@PathVariable("id") Long id, Authentication authentication) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    service.remover(id, usuarioId);
  }
}
