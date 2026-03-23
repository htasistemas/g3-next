package br.com.g3.documentosinstituicao.repositoryimpl;

import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoAnexo;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoAnexoRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class DocumentoInstituicaoAnexoRepositoryImpl implements DocumentoInstituicaoAnexoRepository {
  private final DocumentoInstituicaoAnexoJpaRepository jpaRepository;

  public DocumentoInstituicaoAnexoRepositoryImpl(DocumentoInstituicaoAnexoJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public DocumentoInstituicaoAnexo salvar(DocumentoInstituicaoAnexo anexo) {
    return jpaRepository.save(anexo);
  }

  @Override
  public List<DocumentoInstituicaoAnexo> listarPorDocumento(Long documentoId) {
    return jpaRepository.findAllByDocumentoIdOrderByDataUploadDescIdDesc(documentoId);
  }

  @Override
  public Optional<DocumentoInstituicaoAnexo> buscarPorId(Long id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void remover(DocumentoInstituicaoAnexo anexo) {
    jpaRepository.delete(anexo);
  }

  @Override
  public void removerPorDocumento(Long documentoId) {
    jpaRepository.deleteAllByDocumentoId(documentoId);
  }
}
