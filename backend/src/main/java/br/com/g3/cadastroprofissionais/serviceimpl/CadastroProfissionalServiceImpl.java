package br.com.g3.cadastroprofissionais.serviceimpl;

import br.com.g3.cadastroprofissionais.domain.CadastroProfissional;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalCriacaoRequest;
import br.com.g3.cadastroprofissionais.dto.CadastroProfissionalResponse;
import br.com.g3.cadastroprofissionais.mapper.CadastroProfissionalMapper;
import br.com.g3.cadastroprofissionais.repository.CadastroProfissionalRepository;
import br.com.g3.cadastroprofissionais.service.CadastroProfissionalService;
import br.com.g3.usuario.domain.Usuario;
import br.com.g3.usuario.repository.UsuarioRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CadastroProfissionalServiceImpl implements CadastroProfissionalService {
  private final CadastroProfissionalRepository repository;
  private final UsuarioRepository usuarioRepository;

  public CadastroProfissionalServiceImpl(
      CadastroProfissionalRepository repository, UsuarioRepository usuarioRepository) {
    this.repository = repository;
    this.usuarioRepository = usuarioRepository;
  }

  @Override
  @Transactional
  public CadastroProfissionalResponse criar(CadastroProfissionalCriacaoRequest request, Long usuarioId) {
    UUID tenantId = obterTenantIdObrigatorio(usuarioId);
    CadastroProfissional cadastro = CadastroProfissionalMapper.toDomain(request);
    cadastro.setTenantId(tenantId);
    CadastroProfissional salvo = repository.salvar(cadastro);
    return CadastroProfissionalMapper.toResponse(salvo);
  }

  @Override
  @Transactional
  public CadastroProfissionalResponse atualizar(
      Long id, CadastroProfissionalCriacaoRequest request, Long usuarioId) {
    UUID tenantId = obterTenantIdObrigatorio(usuarioId);
    CadastroProfissional cadastro =
        repository
            .buscarPorId(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    CadastroProfissionalMapper.aplicarAtualizacao(cadastro, request);
    cadastro.setTenantId(tenantId);
    CadastroProfissional salvo = repository.salvar(cadastro);
    return CadastroProfissionalMapper.toResponse(salvo);
  }

  @Override
  public CadastroProfissionalResponse buscarPorId(Long id, Long usuarioId) {
    UUID tenantId = obterTenantIdObrigatorio(usuarioId);
    CadastroProfissional cadastro =
        repository
            .buscarPorId(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return CadastroProfissionalMapper.toResponse(cadastro);
  }

  @Override
  public List<CadastroProfissionalResponse> listar(String nome, Long usuarioId) {
    UUID tenantId = obterTenantIdObrigatorio(usuarioId);
    List<CadastroProfissional> cadastros =
        (nome == null || nome.trim().isEmpty())
            ? repository.listar(tenantId)
            : repository.buscarPorNome(nome, tenantId);
    return cadastros.stream().map(CadastroProfissionalMapper::toResponse).collect(Collectors.toList());
  }

  @Override
  public void remover(Long id, Long usuarioId) {
    UUID tenantId = obterTenantIdObrigatorio(usuarioId);
    CadastroProfissional cadastro =
        repository
            .buscarPorId(id, tenantId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    repository.remover(cadastro);
  }

  private UUID obterTenantIdObrigatorio(Long usuarioId) {
    Usuario usuario =
        usuarioRepository
            .buscarPorId(usuarioId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessao invalida."));
    if (usuario.getTenantId() == null) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Usuario autenticado sem tenant vinculado.");
    }
    return usuario.getTenantId();
  }
}
