package br.com.g3.cadastroprofissionais.repositoryimpl;

import br.com.g3.cadastroprofissionais.domain.CadastroProfissional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CadastroProfissionalJpaRepository extends JpaRepository<CadastroProfissional, Long> {
  List<CadastroProfissional> findByNomeCompletoContainingIgnoreCase(String nomeCompleto);

  List<CadastroProfissional> findAllByTenantId(UUID tenantId);

  List<CadastroProfissional> findByNomeCompletoContainingIgnoreCaseAndTenantId(
      String nomeCompleto, UUID tenantId);

  Optional<CadastroProfissional> findByIdAndTenantId(Long id, UUID tenantId);
}
