package br.com.g3.configuracoes.repositoryimpl;

import br.com.g3.configuracoes.domain.DocumentoBeneficiarioConfiguracao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoBeneficiarioConfiguracaoJpaRepository
    extends JpaRepository<DocumentoBeneficiarioConfiguracao, Long> {
  List<DocumentoBeneficiarioConfiguracao> findAllByOrderByOrdemAscIdAsc();

  void deleteByIdNotIn(List<Long> ids);
}
