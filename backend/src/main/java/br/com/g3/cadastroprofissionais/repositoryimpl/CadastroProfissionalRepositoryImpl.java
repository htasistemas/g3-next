package br.com.g3.cadastroprofissionais.repositoryimpl;

import br.com.g3.cadastroprofissionais.domain.CadastroProfissional;
import br.com.g3.cadastroprofissionais.repository.CadastroProfissionalRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class CadastroProfissionalRepositoryImpl implements CadastroProfissionalRepository {
  private final CadastroProfissionalJpaRepository jpaRepository;

  public CadastroProfissionalRepositoryImpl(CadastroProfissionalJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public CadastroProfissional salvar(CadastroProfissional cadastro) {
    return jpaRepository.save(cadastro);
  }

  @Override
  public List<CadastroProfissional> listar() {
    return jpaRepository.findAll();
  }

  @Override
  public List<CadastroProfissional> listar(UUID tenantId) {
    return jpaRepository.findAllByTenantId(tenantId);
  }

  @Override
  public List<CadastroProfissional> buscarPorNome(String nome) {
    return jpaRepository.findByNomeCompletoContainingIgnoreCase(nome);
  }

  @Override
  public List<CadastroProfissional> buscarPorNome(String nome, UUID tenantId) {
    return jpaRepository.findByNomeCompletoContainingIgnoreCaseAndTenantId(nome, tenantId);
  }

  @Override
  public Optional<CadastroProfissional> buscarPorId(Long id) {
    return jpaRepository.findById(id);
  }

  @Override
  public Optional<CadastroProfissional> buscarPorId(Long id, UUID tenantId) {
    return jpaRepository.findByIdAndTenantId(id, tenantId);
  }

  @Override
  public void remover(CadastroProfissional cadastro) {
    jpaRepository.delete(cadastro);
  }
}
