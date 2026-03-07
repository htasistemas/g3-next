package br.com.g3.autenticacao.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

public final class UsuarioAutenticadoUtil {
  private UsuarioAutenticadoUtil() {}

  public static Long obterIdObrigatorio(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof UsuarioAutenticado usuario)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessao invalida ou expirada.");
    }
    return usuario.id();
  }
}
