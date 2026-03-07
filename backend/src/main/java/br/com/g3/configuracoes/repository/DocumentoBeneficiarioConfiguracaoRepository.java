package br.com.g3.configuracoes.repository;

import br.com.g3.configuracoes.domain.DocumentoBeneficiarioConfiguracao;
import java.util.List;

public interface DocumentoBeneficiarioConfiguracaoRepository {
  List<DocumentoBeneficiarioConfiguracao> listarOrdenado();

  List<DocumentoBeneficiarioConfiguracao> salvarTodos(List<DocumentoBeneficiarioConfiguracao> documentos);

  void removerNaoContidos(List<Long> ids);

  void removerTodos();
}
