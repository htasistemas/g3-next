package br.com.g3.autenticacao.security;

import br.com.g3.usuario.domain.Usuario;
import java.util.Optional;

public interface TokenAutenticacaoService {
  String gerarToken(Usuario usuario);

  Optional<TokenAutenticacaoPayload> validarToken(String token);
}
