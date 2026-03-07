package br.com.g3.informacoesadministrativas.controller;

import br.com.g3.autenticacao.security.UsuarioAutenticadoUtil;
import br.com.g3.informacoesadministrativas.dto.InformacaoAdministrativaRequest;
import br.com.g3.informacoesadministrativas.dto.InformacaoAdministrativaResponse;
import br.com.g3.informacoesadministrativas.dto.InformacaoAdministrativaRevealResponse;
import br.com.g3.informacoesadministrativas.service.InformacaoAdministrativaService;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/admin-info")
public class InformacaoAdministrativaController {
  private final InformacaoAdministrativaService service;

  public InformacaoAdministrativaController(InformacaoAdministrativaService service) {
    this.service = service;
  }

  @GetMapping
  public List<InformacaoAdministrativaResponse> listar(
      @RequestParam(value = "tipo", required = false) String tipo,
      @RequestParam(value = "categoria", required = false) String categoria,
      @RequestParam(value = "titulo", required = false) String titulo,
      @RequestParam(value = "tags", required = false) String tags,
      @RequestParam(value = "status", required = false) Boolean status,
      Authentication authentication,
      HttpServletRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.listar(tipo, categoria, titulo, tags, status, usuarioId, obterIp(request));
  }

  @GetMapping("/{id}")
  public InformacaoAdministrativaResponse buscarPorId(
      @PathVariable("id") Long id,
      Authentication authentication,
      HttpServletRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.buscarPorId(id, usuarioId, obterIp(request));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public InformacaoAdministrativaResponse criar(
      Authentication authentication,
      @Valid @RequestBody InformacaoAdministrativaRequest request,
      HttpServletRequest servletRequest) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.criar(request, usuarioId, obterIp(servletRequest));
  }

  @PutMapping("/{id}")
  public InformacaoAdministrativaResponse atualizar(
      @PathVariable("id") Long id,
      Authentication authentication,
      @Valid @RequestBody InformacaoAdministrativaRequest request,
      HttpServletRequest servletRequest) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.atualizar(id, request, usuarioId, obterIp(servletRequest));
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remover(
      @PathVariable("id") Long id,
      Authentication authentication,
      HttpServletRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    service.remover(id, usuarioId, obterIp(request));
  }

  @PostMapping("/{id}/reveal")
  public InformacaoAdministrativaRevealResponse revelar(
      @PathVariable("id") Long id,
      Authentication authentication,
      HttpServletRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    return service.revelar(id, usuarioId, obterIp(request));
  }

  @PostMapping("/{id}/copy-audit")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void copiar(
      @PathVariable("id") Long id,
      Authentication authentication,
      HttpServletRequest request) {
    Long usuarioId = UsuarioAutenticadoUtil.obterIdObrigatorio(authentication);
    service.registrarCopia(id, usuarioId, obterIp(request));
  }

  private String obterIp(HttpServletRequest request) {
    if (request == null) {
      return null;
    }
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
