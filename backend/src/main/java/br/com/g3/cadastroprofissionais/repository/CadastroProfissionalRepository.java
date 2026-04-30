package br.com.g3.cadastroprofissionais.repository;

import br.com.g3.cadastroprofissionais.domain.CadastroProfissional;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CadastroProfissionalRepository {
  CadastroProfissional salvar(CadastroProfissional cadastro);

  List<CadastroProfissional> listar();

  List<CadastroProfissional> listar(UUID tenantId);

  List<CadastroProfissional> buscarPorNome(String nome);

  List<CadastroProfissional> buscarPorNome(String nome, UUID tenantId);

  Optional<CadastroProfissional> buscarPorId(Long id);

  Optional<CadastroProfissional> buscarPorId(Long id, UUID tenantId);

  void remover(CadastroProfissional cadastro);
}
