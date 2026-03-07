package br.com.g3.autenticacao.serviceimpl;

import br.com.g3.autenticacao.domain.UsuarioRecuperacaoSenha;
import br.com.g3.autenticacao.dto.CadastroContaRequest;
import br.com.g3.autenticacao.dto.LoginRequest;
import br.com.g3.autenticacao.dto.LoginResponse;
import br.com.g3.autenticacao.dto.GoogleLoginRequest;
import br.com.g3.autenticacao.dto.RecuperarSenhaRequest;
import br.com.g3.autenticacao.dto.RedefinirSenhaRequest;
import br.com.g3.autenticacao.dto.UsuarioInfo;
import br.com.g3.autenticacao.security.TokenAutenticacaoService;
import br.com.g3.autenticacao.repository.UsuarioRecuperacaoSenhaRepository;
import br.com.g3.autenticacao.service.AutenticacaoService;
import br.com.g3.autenticacao.service.GoogleTokenService;
import br.com.g3.autenticacao.service.GoogleTokenService.GoogleUsuarioInfo;
import br.com.g3.shared.service.EmailService;
import br.com.g3.usuario.domain.Permissao;
import br.com.g3.usuario.domain.Usuario;
import br.com.g3.usuario.repository.UsuarioRepository;
import br.com.g3.usuario.service.PermissaoService;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AutenticacaoServiceImpl implements AutenticacaoService {
  private static final Logger log = LoggerFactory.getLogger(AutenticacaoServiceImpl.class);
  private final UsuarioRepository repository;
  private final UsuarioRecuperacaoSenhaRepository recuperacaoRepository;        
  private final PasswordEncoder passwordEncoder;
  private final EmailService emailService;
  private final GoogleTokenService googleTokenService;
  private final PermissaoService permissaoService;
  private final TokenAutenticacaoService tokenAutenticacaoService;
  private final SecureRandom secureRandom = new SecureRandom();
  private static final DateTimeFormatter DATA_HORA_FORMATO =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.forLanguageTag("pt-BR"));

  public AutenticacaoServiceImpl(
      UsuarioRepository repository,
      UsuarioRecuperacaoSenhaRepository recuperacaoRepository,
      PasswordEncoder passwordEncoder,
      EmailService emailService,
      GoogleTokenService googleTokenService,
      PermissaoService permissaoService,
      TokenAutenticacaoService tokenAutenticacaoService) {
    this.repository = repository;
    this.recuperacaoRepository = recuperacaoRepository;
    this.passwordEncoder = passwordEncoder;
    this.emailService = emailService;
    this.googleTokenService = googleTokenService;
    this.permissaoService = permissaoService;
    this.tokenAutenticacaoService = tokenAutenticacaoService;
  }

  @Override
  public LoginResponse autenticar(LoginRequest request) {
    Usuario usuario = buscarUsuarioPorLogin(request.getNomeUsuario());

    if (!passwordEncoder.matches(request.getSenha(), usuario.getSenhaHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais invalidas");
    }

    String token = tokenAutenticacaoService.gerarToken(usuario);
    List<String> permissoes =
        usuario.getPermissoes().stream().map(p -> p.getNome()).collect(Collectors.toList());
    UsuarioInfo usuarioInfo =
        new UsuarioInfo(
            usuario.getId(), usuario.getNomeUsuario(), usuario.getNome(), usuario.getEmail(), permissoes);
    return new LoginResponse(token, usuarioInfo);
  }

  @Override
  @Transactional
  public LoginResponse autenticarGoogle(GoogleLoginRequest request) {
    GoogleUsuarioInfo info = googleTokenService.validarIdToken(request.getIdToken());
    String email = info.email() == null ? "" : info.email().trim().toLowerCase();
    if (email.isBlank()) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email invalido");
    }

    Usuario usuario =
        repository
            .buscarPorEmailIgnoreCase(email)
            .map(
                existente -> {
                  String googleIdAtual = existente.getGoogleId();
                  if (googleIdAtual != null
                      && !googleIdAtual.isBlank()
                      && !googleIdAtual.equals(info.googleId())) {
                    log.warn("Tentativa de vinculo Google divergente para email {}", email);
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Conta nao autorizada");
                  }
                  boolean atualizado = false;
                  if ((googleIdAtual == null || googleIdAtual.isBlank()) && info.googleId() != null) {
                    existente.setGoogleId(info.googleId());
                    atualizado = true;
                  }
                  if (info.nome() != null && !info.nome().isBlank()
                      && (existente.getNome() == null || existente.getNome().isBlank())) {
                    existente.setNome(info.nome());
                    atualizado = true;
                  }
                  if (info.fotoUrl() != null && !info.fotoUrl().isBlank()) {
                    existente.setFotoUrl(info.fotoUrl());
                    atualizado = true;
                  }
                  if (existente.getNomeUsuario() == null || existente.getNomeUsuario().isBlank()) {
                    existente.setNomeUsuario(email);
                    atualizado = true;
                  }
                  if (existente.getEmail() == null || existente.getEmail().isBlank()) {
                    existente.setEmail(email);
                    atualizado = true;
                  }
                  if (atualizado) {
                    existente.setAtualizadoEm(LocalDateTime.now());
                    return repository.salvar(existente);
                  }
                  return existente;
                })
            .orElseGet(
                () -> {
                  Usuario novo = new Usuario();
                  novo.setNomeUsuario(email);
                  novo.setNome(info.nome() == null || info.nome().isBlank() ? email : info.nome());
                  novo.setEmail(email);
                  novo.setGoogleId(info.googleId());
                  novo.setFotoUrl(info.fotoUrl());
                  novo.setSenhaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                  novo.setPermissoes(new HashSet<>(permissaoService.buscarPorNomes(List.of("OPERADOR"))));
                  LocalDateTime agora = LocalDateTime.now();
                  novo.setCriadoEm(agora);
                  novo.setAtualizadoEm(agora);
                  return repository.salvar(novo);
                });

    String token = tokenAutenticacaoService.gerarToken(usuario);
    List<String> permissoes =
        usuario.getPermissoes().stream().map(Permissao::getNome).collect(Collectors.toList());
    UsuarioInfo usuarioInfo =
        new UsuarioInfo(
            usuario.getId(), usuario.getNomeUsuario(), usuario.getNome(), usuario.getEmail(), permissoes);
    return new LoginResponse(token, usuarioInfo);
  }

  @Override
  @Transactional
  public void cadastrarConta(CadastroContaRequest request) {
    String email = request.getEmail().trim().toLowerCase();

    repository
        .buscarPorEmailIgnoreCase(email)
        .ifPresent(
            usuario -> {
              throw new ResponseStatusException(HttpStatus.CONFLICT, "Email ja cadastrado");
            });

    repository
        .buscarPorNomeUsuarioIgnoreCase(email)
        .ifPresent(
            usuario -> {
              throw new ResponseStatusException(HttpStatus.CONFLICT, "Email ja cadastrado");
            });

    Usuario usuario = new Usuario();
    usuario.setNomeUsuario(email);
    usuario.setNome(request.getNome().trim());
    usuario.setEmail(email);
    usuario.setSenhaHash(passwordEncoder.encode(request.getSenha()));
    LocalDateTime agora = LocalDateTime.now();
    usuario.setCriadoEm(agora);
    usuario.setAtualizadoEm(agora);

    repository.salvar(usuario);
  }

  @Override
  @Transactional
  public void solicitarRecuperacaoSenha(RecuperarSenhaRequest request) {        
    String email = request.getEmail().trim().toLowerCase();
    Usuario usuario =
        repository
            .buscarPorEmailIgnoreCase(email)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Email nao encontrado"));

    LocalDateTime agora = LocalDateTime.now();
    recuperacaoRepository.marcarTokensComoUsados(usuario, agora);

    UsuarioRecuperacaoSenha token = new UsuarioRecuperacaoSenha();
    token.setUsuario(usuario);
    token.setToken(gerarTokenSeguro());
    token.setCriadoEm(agora);
    token.setExpiraEm(agora.plusHours(2));
    recuperacaoRepository.salvar(token);

    String validade = token.getExpiraEm().format(DATA_HORA_FORMATO);
    emailService.enviarRecuperacaoSenha(
        usuario.getEmail(),
        usuario.getNome(),
        token.getToken(),
        validade);
  }

  @Override
  @Transactional
  public void redefinirSenha(RedefinirSenhaRequest request) {
    if (!request.getSenha().equals(request.getConfirmarSenha())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Senha e confirmacao nao conferem");
    }

    String tokenInformado = request.getToken() == null ? "" : request.getToken().trim();

    UsuarioRecuperacaoSenha token =
        recuperacaoRepository
            .buscarPorToken(tokenInformado)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY, "Token invalido ou expirado"));

    if (token.getUsadoEm() != null || token.getExpiraEm().isBefore(LocalDateTime.now())) {
      throw new ResponseStatusException(
          HttpStatus.UNPROCESSABLE_ENTITY, "Token invalido ou expirado");
    }

    Usuario usuario = token.getUsuario();
    usuario.setSenhaHash(passwordEncoder.encode(request.getSenha()));
    usuario.setAtualizadoEm(LocalDateTime.now());
    repository.salvar(usuario);

    token.setUsadoEm(LocalDateTime.now());
    recuperacaoRepository.salvar(token);
  }

  private Usuario buscarUsuarioPorLogin(String login) {
    String valor = login == null ? "" : login.trim();
    return repository
        .buscarPorNomeUsuarioIgnoreCase(valor)
        .orElseGet(
            () ->
                repository
                    .buscarPorEmailIgnoreCase(valor)
                    .orElseThrow(
                        () ->
                            new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED, "Credenciais invalidas")));
  }

  private String gerarTokenSeguro() {
    int valor = secureRandom.nextInt(1_000_000);
    return String.format("%06d", valor);
  }
}

