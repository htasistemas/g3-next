package br.com.g3.documentosinstituicao.serviceimpl;

import br.com.g3.documentosinstituicao.domain.DocumentoInstituicao;
import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoAnexo;
import br.com.g3.documentosinstituicao.domain.DocumentoInstituicaoHistorico;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoAnexoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoHistoricoResponse;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoRequest;
import br.com.g3.documentosinstituicao.dto.DocumentoInstituicaoResponse;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoAnexoRepository;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoHistoricoRepository;
import br.com.g3.documentosinstituicao.repository.DocumentoInstituicaoRepository;
import br.com.g3.documentosinstituicao.service.ArmazenamentoDocumentoInstituicaoAnexoService;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentoInstituicaoServiceImpl implements br.com.g3.documentosinstituicao.service.DocumentoInstituicaoService {
  private static final int DIAS_ALERTA_PADRAO = 30;
  private static final String USUARIO_SISTEMA = "Sistema";
  private final DocumentoInstituicaoRepository repository;
  private final DocumentoInstituicaoAnexoRepository anexoRepository;
  private final DocumentoInstituicaoHistoricoRepository historicoRepository;
  private final ArmazenamentoDocumentoInstituicaoAnexoService armazenamentoService;

  public DocumentoInstituicaoServiceImpl(
      DocumentoInstituicaoRepository repository,
      DocumentoInstituicaoAnexoRepository anexoRepository,
      DocumentoInstituicaoHistoricoRepository historicoRepository,
      ArmazenamentoDocumentoInstituicaoAnexoService armazenamentoService) {
    this.repository = repository;
    this.anexoRepository = anexoRepository;
    this.historicoRepository = historicoRepository;
    this.armazenamentoService = armazenamentoService;
  }

  @Override
  public List<DocumentoInstituicaoResponse> listar() {
    List<DocumentoInstituicaoResponse> resposta = new ArrayList<>();
    for (DocumentoInstituicao documento : repository.listar()) {
      resposta.add(mapDocumentoResponse(documento));
    }
    return resposta;
  }

  @Override
  @Transactional
  public DocumentoInstituicaoResponse criar(DocumentoInstituicaoRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe os dados do documento.");
    }
    validarDatas(request);
    DocumentoInstituicao documento = new DocumentoInstituicao();
    aplicarRequest(documento, request);
    LocalDateTime agora = LocalDateTime.now();
    documento.setCriadoEm(agora);
    documento.setAtualizadoEm(agora);
    documento.setSituacao(calcularSituacao(documento));
    DocumentoInstituicao salvo = repository.salvar(documento);
    registrarHistoricoInterno(
        salvo.getId(),
        obterUsuarioPadrao(request.getResponsavelInterno()),
        "Cadastro",
        "Documento cadastrado.");
    return mapDocumentoResponse(salvo);
  }

  @Override
  @Transactional
  public DocumentoInstituicaoResponse atualizar(Long id, DocumentoInstituicaoRequest request) {
    DocumentoInstituicao documento =
        repository
            .buscarPorId(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento nao encontrado."));
    validarDatas(request);
    aplicarRequest(documento, request);
    documento.setAtualizadoEm(LocalDateTime.now());
    documento.setSituacao(calcularSituacao(documento));
    DocumentoInstituicao salvo = repository.salvar(documento);
    registrarHistoricoInterno(
        salvo.getId(),
        obterUsuarioPadrao(request.getResponsavelInterno()),
        "Atualizacao",
        "Documento atualizado.");
    return mapDocumentoResponse(salvo);
  }

  @Override
  @Transactional
  public void excluir(Long id) {
    DocumentoInstituicao documento =
        repository
            .buscarPorId(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento nao encontrado."));
    repository.remover(documento);
  }

  @Override
  public List<DocumentoInstituicaoAnexoResponse> listarAnexos(Long documentoId) {
    validarDocumentoExistente(documentoId);
    List<DocumentoInstituicaoAnexoResponse> resposta = new ArrayList<>();
    for (DocumentoInstituicaoAnexo anexo : anexoRepository.listarPorDocumento(documentoId)) {
      resposta.add(mapAnexoResponse(anexo));
    }
    return resposta;
  }

  @Override
  @Transactional
  public DocumentoInstituicaoAnexoResponse adicionarAnexo(Long documentoId, DocumentoInstituicaoAnexoRequest request) {
    DocumentoInstituicao documento = validarDocumentoExistente(documentoId);
    validarRequestAnexo(request);
    String caminhoArquivo = armazenamentoService.salvarArquivo(documentoId, request);
    DocumentoInstituicaoAnexo anexo = new DocumentoInstituicaoAnexo();
    anexo.setDocumentoId(documentoId);
    anexo.setNomeArquivo(request.getNomeArquivo());
    anexo.setTipo(request.getTipo());
    anexo.setTipoMime(request.getTipoMime());
    anexo.setTamanho(request.getTamanho());
    anexo.setCaminhoArquivo(caminhoArquivo);
    anexo.setDataUpload(request.getDataUpload() != null ? request.getDataUpload() : LocalDate.now());
    anexo.setUsuario(request.getUsuario());
    anexo.setCriadoEm(LocalDateTime.now());
    DocumentoInstituicaoAnexo salvo = anexoRepository.salvar(anexo);
    documento.setAtualizadoEm(LocalDateTime.now());
    repository.salvar(documento);
    registrarHistoricoInterno(
        documentoId,
        request.getUsuario(),
        "Anexo",
        "Anexo registrado: " + request.getNomeArquivo());
    return mapAnexoResponse(salvo);
  }

  @Override
  @Transactional
  public DocumentoInstituicaoAnexoResponse substituirAnexo(
      Long documentoId, Long anexoId, DocumentoInstituicaoAnexoRequest request) {
    DocumentoInstituicao documento = validarDocumentoExistente(documentoId);
    validarRequestAnexo(request);
    DocumentoInstituicaoAnexo existente = buscarAnexoDoDocumento(documentoId, anexoId);
    String caminhoAnterior = existente.getCaminhoArquivo();
    String caminhoArquivo = armazenamentoService.salvarArquivo(documentoId, request);
    existente.setNomeArquivo(request.getNomeArquivo());
    existente.setTipo(request.getTipo());
    existente.setTipoMime(request.getTipoMime());
    existente.setTamanho(request.getTamanho());
    existente.setCaminhoArquivo(caminhoArquivo);
    existente.setDataUpload(request.getDataUpload() != null ? request.getDataUpload() : LocalDate.now());
    existente.setUsuario(request.getUsuario());
    DocumentoInstituicaoAnexo salvo = anexoRepository.salvar(existente);
    documento.setAtualizadoEm(LocalDateTime.now());
    repository.salvar(documento);
    if (!Objects.equals(caminhoAnterior, caminhoArquivo)) {
      armazenamentoService.excluirArquivo(caminhoAnterior, documentoId);
    }
    registrarHistoricoInterno(
        documentoId,
        request.getUsuario(),
        "Anexo",
        "Anexo atualizado: " + request.getNomeArquivo());
    return mapAnexoResponse(salvo);
  }

  @Override
  @Transactional
  public void excluirAnexo(Long documentoId, Long anexoId) {
    DocumentoInstituicao documento = validarDocumentoExistente(documentoId);
    DocumentoInstituicaoAnexo anexo = buscarAnexoDoDocumento(documentoId, anexoId);
    anexoRepository.remover(anexo);
    armazenamentoService.excluirArquivo(anexo.getCaminhoArquivo(), documentoId);
    documento.setAtualizadoEm(LocalDateTime.now());
    repository.salvar(documento);
    registrarHistoricoInterno(
        documentoId,
        obterUsuarioPadrao(anexo.getUsuario()),
        "Anexo",
        "Anexo removido: " + anexo.getNomeArquivo());
  }

  @Override
  public Resource obterArquivoAnexo(Long documentoId, Long anexoId) {
    validarDocumentoExistente(documentoId);
    DocumentoInstituicaoAnexo anexo =
        anexoRepository
            .buscarPorId(anexoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo nao encontrado."));
    if (!documentoId.equals(anexo.getDocumentoId())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo nao encontrado.");
    }
    if (anexo.getCaminhoArquivo() == null || anexo.getCaminhoArquivo().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo nao encontrado.");
    }
    try {
      Path caminho = armazenamentoService.resolverCaminhoArquivo(anexo.getCaminhoArquivo(), documentoId);
      if (caminho == null) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo nao encontrado.");
      }
      Resource resource = new UrlResource(caminho.toUri());
      if (!resource.exists()) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo nao encontrado.");
      }
      return resource;
    } catch (Exception ex) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Arquivo nao encontrado.");
    }
  }

  @Override
  public List<DocumentoInstituicaoHistoricoResponse> listarHistorico(Long documentoId) {
    validarDocumentoExistente(documentoId);
    List<DocumentoInstituicaoHistoricoResponse> resposta = new ArrayList<>();
    for (DocumentoInstituicaoHistorico historico : historicoRepository.listarPorDocumento(documentoId)) {
      resposta.add(mapHistoricoResponse(historico));
    }
    return resposta;
  }

  @Override
  @Transactional
  public DocumentoInstituicaoHistoricoResponse adicionarHistorico(
      Long documentoId, DocumentoInstituicaoHistoricoRequest request) {
    validarDocumentoExistente(documentoId);
    DocumentoInstituicaoHistorico historico = new DocumentoInstituicaoHistorico();
    LocalDateTime agora = LocalDateTime.now();
    historico.setDocumentoId(documentoId);
    historico.setDataHora(request.getDataHora() != null ? request.getDataHora() : agora);
    historico.setUsuario(request.getUsuario());
    historico.setTipoAlteracao(request.getTipoAlteracao());
    historico.setObservacao(request.getObservacao());
    historico.setCriadoEm(agora);
    DocumentoInstituicaoHistorico salvo = historicoRepository.salvar(historico);
    return mapHistoricoResponse(salvo);
  }

  private DocumentoInstituicao validarDocumentoExistente(Long documentoId) {
    return repository
        .buscarPorId(documentoId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Documento nao encontrado."));
  }

  private DocumentoInstituicaoAnexo buscarAnexoDoDocumento(Long documentoId, Long anexoId) {
    DocumentoInstituicaoAnexo anexo =
        anexoRepository
            .buscarPorId(anexoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo nao encontrado."));
    if (!documentoId.equals(anexo.getDocumentoId())) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Anexo nao encontrado.");
    }
    return anexo;
  }

  private void validarRequestAnexo(DocumentoInstituicaoAnexoRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe os dados do anexo.");
    }
    if (request.getNomeArquivo() == null || request.getNomeArquivo().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nome do arquivo e obrigatorio.");
    }
    if (request.getTipo() == null || request.getTipo().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo do arquivo e obrigatorio.");
    }
    if (request.getTipoMime() == null || request.getTipoMime().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo MIME do arquivo e obrigatorio.");
    }
    if (request.getUsuario() == null || request.getUsuario().trim().isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuario responsavel e obrigatorio.");
    }
    boolean possuiConteudo = request.getConteudoBase64() != null && !request.getConteudoBase64().trim().isEmpty();
    boolean possuiCaminho = request.getCaminhoArquivo() != null && !request.getCaminhoArquivo().trim().isEmpty();
    if (!possuiConteudo && !possuiCaminho) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Conteudo do arquivo e obrigatorio.");
    }
  }

  private void validarDatas(DocumentoInstituicaoRequest request) {
    if (request == null || request.getEmissao() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data de emissao e obrigatoria.");
    }
    if (Boolean.TRUE.equals(request.getSemVencimento())) {
      return;
    }
    LocalDate validade = request.getValidade();
    if (validade != null && validade.isBefore(request.getEmissao())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A data de vencimento nao pode ser anterior a data de emissao.");
    }
  }

  private void aplicarRequest(DocumentoInstituicao documento, DocumentoInstituicaoRequest request) {
    documento.setTipoDocumento(request.getTipoDocumento());
    documento.setOrgaoEmissor(request.getOrgaoEmissor());
    documento.setDescricao(request.getDescricao());
    documento.setCategoria(request.getCategoria());
    documento.setEmissao(request.getEmissao());
    documento.setValidade(Boolean.TRUE.equals(request.getSemVencimento()) ? null : request.getValidade());
    documento.setResponsavelInterno(request.getResponsavelInterno());
    documento.setModoRenovacao(request.getModoRenovacao());
    documento.setObservacaoRenovacao(request.getObservacaoRenovacao());
    documento.setGerarAlerta(request.getGerarAlerta() != null ? request.getGerarAlerta() : Boolean.TRUE);
    documento.setDiasAntecedencia(request.getDiasAntecedencia());
    documento.setFormaAlerta(request.getFormaAlerta());
    documento.setEmRenovacao(request.getEmRenovacao() != null ? request.getEmRenovacao() : Boolean.FALSE);
    documento.setSemVencimento(request.getSemVencimento() != null ? request.getSemVencimento() : Boolean.FALSE);
    documento.setVencimentoIndeterminado(
        request.getVencimentoIndeterminado() != null ? request.getVencimentoIndeterminado() : Boolean.FALSE);
  }

  private String calcularSituacao(DocumentoInstituicao documento) {
    if (Boolean.TRUE.equals(documento.getEmRenovacao())) {
      return "em_renovacao";
    }
    if (Boolean.TRUE.equals(documento.getSemVencimento())) {
      return "sem_vencimento";
    }
    if (documento.getValidade() == null) {
      return "valido";
    }
    long diff = documento.getValidade().toEpochDay() - LocalDate.now().toEpochDay();
    if (diff < 0) {
      return "vencido";
    }
    if (diff <= DIAS_ALERTA_PADRAO) {
      return "vence_em_breve";
    }
    return "valido";
  }

  private void registrarHistoricoInterno(Long documentoId, String usuario, String tipo, String observacao) {
    DocumentoInstituicaoHistorico historico = new DocumentoInstituicaoHistorico();
    LocalDateTime agora = LocalDateTime.now();
    historico.setDocumentoId(documentoId);
    historico.setDataHora(agora);
    historico.setUsuario(usuario);
    historico.setTipoAlteracao(tipo);
    historico.setObservacao(observacao);
    historico.setCriadoEm(agora);
    historicoRepository.salvar(historico);
  }

  private String obterUsuarioPadrao(String responsavelInterno) {
    if (responsavelInterno == null || responsavelInterno.trim().isEmpty()) {
      return USUARIO_SISTEMA;
    }
    return responsavelInterno;
  }

  private DocumentoInstituicaoResponse mapDocumentoResponse(DocumentoInstituicao documento) {
    DocumentoInstituicaoResponse response = new DocumentoInstituicaoResponse();
    response.setId(documento.getId());
    response.setTipoDocumento(documento.getTipoDocumento());
    response.setOrgaoEmissor(documento.getOrgaoEmissor());
    response.setDescricao(documento.getDescricao());
    response.setCategoria(documento.getCategoria());
    response.setEmissao(documento.getEmissao());
    response.setValidade(documento.getValidade());
    response.setResponsavelInterno(documento.getResponsavelInterno());
    response.setModoRenovacao(documento.getModoRenovacao());
    response.setObservacaoRenovacao(documento.getObservacaoRenovacao());
    response.setGerarAlerta(documento.getGerarAlerta());
    response.setDiasAntecedencia(documento.getDiasAntecedencia());
    response.setFormaAlerta(documento.getFormaAlerta());
    response.setEmRenovacao(documento.getEmRenovacao());
    response.setSemVencimento(documento.getSemVencimento());
    response.setVencimentoIndeterminado(documento.getVencimentoIndeterminado());
    response.setSituacao(documento.getSituacao());
    response.setCriadoEm(documento.getCriadoEm());
    response.setAtualizadoEm(documento.getAtualizadoEm());
    return response;
  }

  private DocumentoInstituicaoAnexoResponse mapAnexoResponse(DocumentoInstituicaoAnexo anexo) {
    DocumentoInstituicaoAnexoResponse response = new DocumentoInstituicaoAnexoResponse();
    response.setId(anexo.getId());
    response.setDocumentoId(anexo.getDocumentoId());
    response.setNomeArquivo(anexo.getNomeArquivo());
    response.setTipo(anexo.getTipo());
    response.setTipoMime(anexo.getTipoMime());
    response.setTamanho(anexo.getTamanho());
    if (anexo.getId() != null
        && anexo.getDocumentoId() != null
        && anexo.getCaminhoArquivo() != null
        && !anexo.getCaminhoArquivo().trim().isEmpty()) {
      response.setArquivoUrl(
          "/api/documentos-instituicao/" + anexo.getDocumentoId() + "/anexos/" + anexo.getId() + "/arquivo");
    }
    response.setDataUpload(anexo.getDataUpload());
    response.setUsuario(anexo.getUsuario());
    response.setCriadoEm(anexo.getCriadoEm());
    return response;
  }

  private DocumentoInstituicaoHistoricoResponse mapHistoricoResponse(DocumentoInstituicaoHistorico historico) {
    DocumentoInstituicaoHistoricoResponse response = new DocumentoInstituicaoHistoricoResponse();
    response.setId(historico.getId());
    response.setDocumentoId(historico.getDocumentoId());
    response.setDataHora(historico.getDataHora());
    response.setUsuario(historico.getUsuario());
    response.setTipoAlteracao(historico.getTipoAlteracao());
    response.setObservacao(historico.getObservacao());
    response.setCriadoEm(historico.getCriadoEm());
    return response;
  }
}
