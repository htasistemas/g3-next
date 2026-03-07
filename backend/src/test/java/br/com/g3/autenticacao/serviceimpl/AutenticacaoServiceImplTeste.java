package br.com.g3.autenticacao.serviceimpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import br.com.g3.autenticacao.dto.LoginRequest;
import br.com.g3.autenticacao.dto.LoginResponse;
import br.com.g3.autenticacao.repository.UsuarioRecuperacaoSenhaRepository;
import br.com.g3.autenticacao.security.TokenAutenticacaoService;
import br.com.g3.autenticacao.service.GoogleTokenService;
import br.com.g3.shared.service.EmailService;
import br.com.g3.usuario.domain.Permissao;
import br.com.g3.usuario.domain.Usuario;
import br.com.g3.usuario.repository.UsuarioRepository;
import br.com.g3.usuario.service.PermissaoService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AutenticacaoServiceImplTeste {
  @Mock
  private UsuarioRepository usuarioRepository;

  @Mock
  private UsuarioRecuperacaoSenhaRepository recuperacaoRepository;

  @Mock
  private PasswordEncoder passwordEncoder;

  @Mock
  private EmailService emailService;

  @Mock
  private GoogleTokenService googleTokenService;

  @Mock
  private PermissaoService permissaoService;

  @Mock
  private TokenAutenticacaoService tokenAutenticacaoService;

  @InjectMocks
  private AutenticacaoServiceImpl autenticacaoService;

  @Test
  void autenticarDeveRetornarTokenQuandoCredenciaisSaoValidas() {
    LoginRequest request = new LoginRequest();
    request.setNomeUsuario("usuario");
    request.setSenha("senha");

    Usuario usuario = new Usuario();
    usuario.setId(10L);
    usuario.setNomeUsuario("usuario");
    usuario.setNome("Usuario de Teste");
    usuario.setEmail("usuario@g3.com.br");
    usuario.setSenhaHash("hash");

    Permissao permissao = new Permissao();
    permissao.setNome("ADMIN");
    usuario.getPermissoes().add(permissao);

    when(usuarioRepository.buscarPorNomeUsuarioIgnoreCase("usuario"))
        .thenReturn(Optional.of(usuario));
    when(passwordEncoder.matches("senha", "hash")).thenReturn(true);
    when(tokenAutenticacaoService.gerarToken(usuario)).thenReturn("token-teste");

    LoginResponse response = autenticacaoService.autenticar(request);

    assertNotNull(response.getToken());
    assertNotNull(response.getUsuario());
    assertEquals(10L, response.getUsuario().getId());
    assertEquals("usuario", response.getUsuario().getNomeUsuario());
  }

  @Test
  void autenticarDeveLancarErroQuandoSenhaIncorreta() {
    LoginRequest request = new LoginRequest();
    request.setNomeUsuario("usuario");
    request.setSenha("senhaErrada");

    Usuario usuario = new Usuario();
    usuario.setNomeUsuario("usuario");
    usuario.setSenhaHash("hash");

    when(usuarioRepository.buscarPorNomeUsuarioIgnoreCase("usuario"))
        .thenReturn(Optional.of(usuario));
    when(passwordEncoder.matches("senhaErrada", "hash")).thenReturn(false);

    ResponseStatusException erro =
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.autenticar(request));

    assertEquals(HttpStatus.UNAUTHORIZED, erro.getStatusCode());
  }
}
