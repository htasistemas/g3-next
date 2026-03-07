package br.com.g3.configuracoes.repositoryimpl;

import br.com.g3.configuracoes.domain.DocumentoBeneficiarioConfiguracao;
import br.com.g3.configuracoes.repository.DocumentoBeneficiarioConfiguracaoRepository;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class DocumentoBeneficiarioConfiguracaoRepositoryImpl
    implements DocumentoBeneficiarioConfiguracaoRepository {
  private final DocumentoBeneficiarioConfiguracaoJpaRepository jpaRepository;

  public DocumentoBeneficiarioConfiguracaoRepositoryImpl(
      DocumentoBeneficiarioConfiguracaoJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public List<DocumentoBeneficiarioConfiguracao> listarOrdenado() {
    return jpaRepository.findAllByOrderByOrdemAscIdAsc();
  }

  @Override
  public List<DocumentoBeneficiarioConfiguracao> salvarTodos(
      List<DocumentoBeneficiarioConfiguracao> documentos) {
    return jpaRepository.saveAll(documentos);
  }

  @Override
  public void removerNaoContidos(List<Long> ids) {
    if (ids == null || ids.isEmpty()) {
      jpaRepository.deleteAll();
      return;
    }
    jpaRepository.deleteByIdNotIn(ids);
  }

  @Override
  public void removerTodos() {
    jpaRepository.deleteAll();
  }
}
