package br.com.g3.documentosinstituicao.repository;

import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoAnexo;
import java.util.List;
import java.util.Optional;

public interface DocumentoInstituicaoAnexoRepository {
  DocumentoInstituicaoAnexo salvar(DocumentoInstituicaoAnexo anexo);

  List<DocumentoInstituicaoAnexo> listarPorDocumento(Long documentoId);

  Optional<DocumentoInstituicaoAnexo> buscarPorId(Long id);

  void remover(DocumentoInstituicaoAnexo anexo);

  void removerPorDocumento(Long documentoId);
}
