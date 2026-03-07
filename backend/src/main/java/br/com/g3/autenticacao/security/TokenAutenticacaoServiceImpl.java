package br.com.g3.autenticacao.security;

import br.com.g3.usuario.domain.Usuario;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenAutenticacaoServiceImpl implements TokenAutenticacaoService {
  private static final Logger LOGGER = LoggerFactory.getLogger(TokenAutenticacaoServiceImpl.class);
  private static final String ALGORITMO_HMAC = "HmacSHA256";
  private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
  private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
  private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

  private final ObjectMapper objectMapper;
  private final SecretKeySpec chaveAssinatura;
  private final long expiracaoMinutos;

  public TokenAutenticacaoServiceImpl(
      ObjectMapper objectMapper,
      @Value("${app.auth.token-secret:}") String tokenSecret,
      @Value("${app.auth.token-expiration-minutes:480}") long tokenExpirationMinutes) {
    this.objectMapper = objectMapper;
    this.chaveAssinatura = new SecretKeySpec(resolverSegredo(tokenSecret), ALGORITMO_HMAC);
    this.expiracaoMinutos = tokenExpirationMinutes > 0 ? tokenExpirationMinutes : 480L;
  }

  @Override
  public String gerarToken(Usuario usuario) {
    Instant agora = Instant.now();
    long emissao = agora.getEpochSecond();
    long expiracao = agora.plus(expiracaoMinutos, ChronoUnit.MINUTES).getEpochSecond();

    Map<String, Object> header = new LinkedHashMap<>();
    header.put("alg", "HS256");
    header.put("typ", "JWT");

    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("sub", String.valueOf(usuario.getId()));
    payload.put("uid", usuario.getId());
    payload.put("usr", usuario.getNomeUsuario());
    payload.put(
        "perms",
        usuario.getPermissoes() == null
            ? List.of()
            : usuario.getPermissoes().stream()
                .map(permissao -> permissao.getNome())
                .filter(nome -> nome != null && !nome.isBlank())
                .collect(Collectors.toList()));
    payload.put("iat", emissao);
    payload.put("exp", expiracao);
    payload.put("jti", UUID.randomUUID().toString());

    String headerCodificado = codificarJson(header);
    String payloadCodificado = codificarJson(payload);
    String assinatura = assinar(headerCodificado + "." + payloadCodificado);
    return headerCodificado + "." + payloadCodificado + "." + assinatura;
  }

  @Override
  public Optional<TokenAutenticacaoPayload> validarToken(String token) {
    try {
      if (token == null || token.isBlank()) {
        return Optional.empty();
      }

      String[] partes = token.split("\\.");
      if (partes.length != 3) {
        return Optional.empty();
      }

      String assinaturaEsperada = assinar(partes[0] + "." + partes[1]);
      if (!MessageDigest.isEqual(
          assinaturaEsperada.getBytes(StandardCharsets.UTF_8),
          partes[2].getBytes(StandardCharsets.UTF_8))) {
        return Optional.empty();
      }

      Map<String, Object> payload =
          objectMapper.readValue(BASE64_URL_DECODER.decode(partes[1]), MAP_TYPE);

      Long usuarioId = converterLong(payload.get("uid"));
      String nomeUsuario = converterTexto(payload.get("usr"));
      List<String> permissoes = converterPermissoes(payload.get("perms"));
      Long expiracao = converterLong(payload.get("exp"));

      if (usuarioId == null || nomeUsuario == null || nomeUsuario.isBlank() || expiracao == null) {
        return Optional.empty();
      }
      if (Instant.now().getEpochSecond() >= expiracao) {
        return Optional.empty();
      }

      return Optional.of(
          new TokenAutenticacaoPayload(
              usuarioId,
              nomeUsuario,
              List.copyOf(permissoes),
              expiracao));
    } catch (Exception ex) {
      LOGGER.debug("Token invalido recebido: {}", ex.getMessage());
      return Optional.empty();
    }
  }

  private String codificarJson(Map<String, Object> dados) {
    try {
      return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(dados));
    } catch (Exception ex) {
      throw new IllegalStateException("Nao foi possivel gerar token de autenticacao.", ex);
    }
  }

  private String assinar(String valor) {
    try {
      Mac mac = Mac.getInstance(ALGORITMO_HMAC);
      mac.init(chaveAssinatura);
      return BASE64_URL_ENCODER.encodeToString(mac.doFinal(valor.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException ex) {
      throw new IllegalStateException("Falha ao assinar token de autenticacao.", ex);
    }
  }

  private byte[] resolverSegredo(String tokenSecret) {
    if (tokenSecret != null && !tokenSecret.isBlank()) {
      byte[] bytes = tokenSecret.trim().getBytes(StandardCharsets.UTF_8);
      if (bytes.length < 32) {
        LOGGER.warn(
            "APP_AUTH_TOKEN_SECRET com tamanho inferior a 32 bytes. Configure um segredo mais forte.");
      }
      return bytes;
    }

    byte[] segredoGerado = new byte[64];
    new SecureRandom().nextBytes(segredoGerado);
    LOGGER.warn(
        "APP_AUTH_TOKEN_SECRET nao configurado. Tokens serao invalidados ao reiniciar a aplicacao.");
    return segredoGerado;
  }

  private Long converterLong(Object valor) {
    if (valor instanceof Number numero) {
      return numero.longValue();
    }
    if (valor instanceof String texto) {
      String textoLimpo = texto.trim();
      if (textoLimpo.isEmpty()) {
        return null;
      }
      try {
        return Long.parseLong(textoLimpo);
      } catch (NumberFormatException ex) {
        return null;
      }
    }
    return null;
  }

  private String converterTexto(Object valor) {
    if (valor instanceof String texto) {
      return texto.trim();
    }
    return null;
  }

  private List<String> converterPermissoes(Object valor) {
    if (!(valor instanceof List<?> lista)) {
      return List.of();
    }
    List<String> permissoes = new ArrayList<>();
    for (Object item : lista) {
      if (item instanceof String texto && !texto.isBlank()) {
        permissoes.add(texto.trim());
      }
    }
    return permissoes;
  }
}
