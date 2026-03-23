package br.com.g3.documentosinstituicao.service;

import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoResponse;
import java.util.List;
import org.springframework.core.io.Resource;

public interface DocumentoInstituicaoService {
  List<DocumentoInstituicaoResponse> listar();

  DocumentoInstituicaoResponse criar(DocumentoInstituicaoRequest request);

  DocumentoInstituicaoResponse atualizar(Long id, DocumentoInstituicaoRequest request);

  void excluir(Long id);

  List<DocumentoInstituicaoAnexoResponse> listarAnexos(Long documentoId);

  DocumentoInstituicaoAnexoResponse adicionarAnexo(Long documentoId, DocumentoInstituicaoAnexoRequest request);

  DocumentoInstituicaoAnexoResponse substituirAnexo(
      Long documentoId, Long anexoId, DocumentoInstituicaoAnexoRequest request);

  void excluirAnexo(Long documentoId, Long anexoId);

  Resource obterArquivoAnexo(Long documentoId, Long anexoId);

  List<DocumentoInstituicaoHistoricoResponse> listarHistorico(Long documentoId);

  DocumentoInstituicaoHistoricoResponse adicionarHistorico(Long documentoId, DocumentoInstituicaoHistoricoRequest request);
}
