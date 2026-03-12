package br.com.g3.autenticacao.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TokenAutenticacaoFilter extends OncePerRequestFilter {
  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final TokenAutenticacaoService tokenService;
  private final ObjectMapper objectMapper;

  public TokenAutenticacaoFilter(TokenAutenticacaoService tokenService, ObjectMapper objectMapper) {
    this.tokenService = tokenService;
    this.objectMapper = objectMapper;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path.startsWith("/api/auth/")
        || path.equals("/api/auth")
        || path.startsWith("/actuator/health")
        || path.equals("/health")
        || path.equals("/error")
        || path.startsWith("/api/config/versao/arquivo");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authorization = request.getHeader(AUTHORIZATION_HEADER);
    if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = authorization.substring(BEARER_PREFIX.length()).trim();
    Optional<TokenAutenticacaoPayload> payloadOpt = tokenService.validarToken(token);
    if (payloadOpt.isEmpty()) {
      responderErro(response, request, HttpStatus.UNAUTHORIZED, "Sessao invalida ou expirada.");
      return;
    }

    TokenAutenticacaoPayload payload = payloadOpt.get();
    if (!usuarioIdCompativel(request, payload)) {
      responderErro(
          response,
          request,
          HttpStatus.FORBIDDEN,
          "Usuario autenticado nao possui permissao para executar esta acao.");
      return;
    }

    UsuarioAutenticado principal =
        new UsuarioAutenticado(payload.usuarioId(), payload.nomeUsuario(), payload.permissoes());
    List<SimpleGrantedAuthority> authorities = construirAuthorities(payload.permissoes());

    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(principal, null, authorities);
    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
    SecurityContextHolder.getContext().setAuthentication(authentication);

    filterChain.doFilter(request, response);
  }

  private List<SimpleGrantedAuthority> construirAuthorities(List<String> permissoes) {
    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
    for (String permissao : permissoes) {
      if (permissao == null || permissao.isBlank()) {
        continue;
      }
      String nome = permissao.trim();
      authorities.add(new SimpleGrantedAuthority(nome));
      authorities.add(new SimpleGrantedAuthority("ROLE_" + nome));
    }
    return authorities;
  }

  private boolean usuarioIdCompativel(HttpServletRequest request, TokenAutenticacaoPayload payload) {
    String usuarioInformado = obterUsuarioIdInformado(request);
    if (usuarioInformado == null || usuarioInformado.isBlank()) {
      return true;
    }
    try {
      Long usuarioId = Long.parseLong(usuarioInformado.trim());
      if (usuarioId.equals(payload.usuarioId())) {
        return true;
      }
      return possuiPermissaoAdmin(payload.permissoes());
    } catch (NumberFormatException ex) {
      return false;
    }
  }

  private String obterUsuarioIdInformado(HttpServletRequest request) {
    String valor = request.getParameter("usuarioId");
    if (valor != null && !valor.isBlank()) {
      return valor;
    }
    String alternativo = request.getParameter("usuario_id");
    if (alternativo != null && !alternativo.isBlank()) {
      return alternativo;
    }
    return null;
  }

  private boolean possuiPermissaoAdmin(List<String> permissoes) {
    return permissoes.stream()
        .filter(permissao -> permissao != null && !permissao.isBlank())
        .map(permissao -> permissao.trim().toUpperCase(Locale.ROOT))
        .anyMatch(
            permissao ->
                permissao.equals("ADMIN")
                    || permissao.equals("ADMINISTRADOR")
                    || permissao.endsWith("_ADMIN"));
  }

  private void responderErro(
      HttpServletResponse response,
      HttpServletRequest request,
      HttpStatus status,
      String mensagem)
      throws IOException {
    response.setStatus(status.value());
    response.setCharacterEncoding("UTF-8");
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);

    RespostaErro erro =
        new RespostaErro(
            OffsetDateTime.now().toString(),
            status.value(),
            status.getReasonPhrase(),
            mensagem,
            request.getRequestURI());
    response.getWriter().write(objectMapper.writeValueAsString(erro));
  }

  private record RespostaErro(
      String timestamp,
      int status,
      String erro,
      String mensagem,
      String caminho) {}
}
