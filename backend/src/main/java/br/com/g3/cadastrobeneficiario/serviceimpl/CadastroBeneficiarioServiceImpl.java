package br.com.g3.cadastrobeneficiario.serviceimpl;

import br.com.g3.cadastrobeneficiario.domain.CadastroBeneficiario;
import br.com.g3.cadastrobeneficiario.domain.DocumentoBeneficiario;
import br.com.g3.cadastrobeneficiario.dto.AptidaoCestaBasicaRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioCriacaoRequest;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResumoResponse;
import br.com.g3.cadastrobeneficiario.dto.DocumentoBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.dto.DocumentoUploadRequest;
import br.com.g3.cadastrobeneficiario.mapper.CadastroBeneficiarioMapper;
import br.com.g3.cadastrobeneficiario.repository.CadastroBeneficiarioRepository;
import br.com.g3.cadastrobeneficiario.repositoryimpl.DocumentoBeneficiarioJpaRepository;
import br.com.g3.cadastrobeneficiario.service.ArmazenamentoDocumentoService;
import br.com.g3.cadastrobeneficiario.service.CadastroBeneficiarioService;
import br.com.g3.unidadeassistencial.domain.Endereco;
import br.com.g3.unidadeassistencial.service.GeocodificacaoService;
import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CadastroBeneficiarioServiceImpl implements CadastroBeneficiarioService {
  private static final Logger LOGGER =
      LoggerFactory.getLogger(CadastroBeneficiarioServiceImpl.class);
  private static final DateTimeFormatter DATA_UI = DateTimeFormatter.ofPattern("dd-MM-yyyy");
  private static final DateTimeFormatter DATA_HORA_UI =
      DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
  private static final Set<String> CAMPOS_IGNORADOS_EMAIL =
      Set.of("class", "id", "dataCadastro", "dataAtualizacao");
  private static final Map<String, String> LABELS_EMAIL = criarLabelsEmail();
  private final CadastroBeneficiarioRepository repository;
  private final ArmazenamentoDocumentoService armazenamentoDocumentoService;
  private final DocumentoBeneficiarioJpaRepository documentoRepository;
  private final GeocodificacaoService geocodificacaoService;
  private final br.com.g3.shared.service.EmailService emailService;

  public CadastroBeneficiarioServiceImpl(
      CadastroBeneficiarioRepository repository,
      ArmazenamentoDocumentoService armazenamentoDocumentoService,
      DocumentoBeneficiarioJpaRepository documentoRepository,
      GeocodificacaoService geocodificacaoService,
      br.com.g3.shared.service.EmailService emailService) {
    this.repository = repository;
    this.armazenamentoDocumentoService = armazenamentoDocumentoService;
    this.documentoRepository = documentoRepository;
    this.geocodificacaoService = geocodificacaoService;
    this.emailService = emailService;
  }

  @Override
  @Transactional
  public CadastroBeneficiarioResponse criar(CadastroBeneficiarioCriacaoRequest request) {
    CadastroBeneficiario cadastro = CadastroBeneficiarioMapper.toDomain(request);
    if (cadastro.getCodigo() == null || cadastro.getCodigo().trim().isEmpty()) {
      cadastro.setCodigo(gerarCodigoSequencial());
    }
    CadastroBeneficiario salvo = repository.salvar(cadastro);
    adicionarDocumentosUpload(salvo, request);
    CadastroBeneficiario atualizado = repository.salvar(salvo);
    CadastroBeneficiarioResponse response = CadastroBeneficiarioMapper.toResponse(atualizado);
    enviarEmailCadastro(response);
    return response;
  }

  @Override
  @Transactional
  public CadastroBeneficiarioResponse atualizar(Long id, CadastroBeneficiarioCriacaoRequest request) {
    CadastroBeneficiario cadastro =
        repository.buscarPorId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    CadastroBeneficiarioResponse cadastroAnterior = CadastroBeneficiarioMapper.toResponse(cadastro);
    CadastroBeneficiarioMapper.aplicarAtualizacao(cadastro, request);
    CadastroBeneficiario salvo = repository.salvar(cadastro);
    adicionarDocumentosUpload(salvo, request);
    CadastroBeneficiario atualizado = repository.salvar(salvo);
    CadastroBeneficiarioResponse response = CadastroBeneficiarioMapper.toResponse(atualizado);
    enviarEmailAtualizacao(cadastroAnterior, response);
    return response;
  }

  @Override
  public CadastroBeneficiarioResponse buscarPorId(Long id) {
    CadastroBeneficiario cadastro =
        repository.buscarPorId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    return CadastroBeneficiarioMapper.toResponse(cadastro);
  }

  @Override
  public List<CadastroBeneficiarioResponse> listar(
      String nome, String status, String codigo, String cpf, String nis, String dataNascimento) {
    boolean temNome = nome != null && !nome.trim().isEmpty();
    boolean temStatus = status != null && !status.trim().isEmpty();
    boolean temCodigo = codigo != null && !codigo.trim().isEmpty();

    List<CadastroBeneficiario> cadastros;
    if (temCodigo) {
      cadastros = repository.buscarPorCodigo(montarCodigosPesquisa(codigo));
      if (cadastros.isEmpty()) {
        String codigoNormalizado = normalizarCodigoComparacao(codigo);
        if (codigoNormalizado != null) {
          cadastros = repository.listar().stream()
              .filter(cadastro -> codigoNormalizado.equals(normalizarCodigoComparacao(cadastro.getCodigo())))
              .collect(Collectors.toList());
        }
      }
      if (temNome) {
        cadastros = cadastros.stream()
            .filter(cadastro -> cadastro.getNomeCompleto() != null
                && cadastro.getNomeCompleto().toLowerCase(Locale.ROOT).contains(nome.toLowerCase(Locale.ROOT)))
            .collect(Collectors.toList());
      }
      if (temStatus) {
        cadastros = cadastros.stream()
            .filter(cadastro -> status.equalsIgnoreCase(cadastro.getStatus()))
            .collect(Collectors.toList());
      }
    } else if (temNome && temStatus) {
      cadastros = repository.listarPorNomeEStatus(nome, status);
    } else if (temNome) {
      cadastros = repository.buscarPorNome(nome);
    } else if (temStatus) {
      cadastros = repository.listar().stream()
          .filter(cadastro -> status.equalsIgnoreCase(cadastro.getStatus()))
          .collect(Collectors.toList());
    } else {
      cadastros = repository.listar();
    }
    List<CadastroBeneficiarioResponse> respostaBase = cadastros.stream()
        .collect(Collectors.toMap(CadastroBeneficiario::getId, cadastro -> cadastro, (a, b) -> a, java.util.LinkedHashMap::new))
        .values()
        .stream()
        .map(CadastroBeneficiarioMapper::toResponse)
        .collect(Collectors.toList());
    return aplicarFiltrosComplementares(respostaBase, cpf, nis, dataNascimento);
  }

  @Override
  public List<CadastroBeneficiarioResumoResponse> listarResumo(
      String nome, String status, String codigo, String cpf, String nis, String dataNascimento) {
    return listar(nome, status, codigo, cpf, nis, dataNascimento).stream()
        .map(cadastro -> new CadastroBeneficiarioResumoResponse(cadastro.getId(), cadastro.getNomeCompleto()))
        .collect(Collectors.toList());
  }

  @Override
  public String obterProximoCodigo() {
    Integer maiorCodigo = repository.buscarMaiorCodigo();
    int proximoCodigo = (maiorCodigo == null ? 0 : maiorCodigo) + 1;
    return String.format("%04d", proximoCodigo);
  }

  private List<CadastroBeneficiarioResponse> aplicarFiltrosComplementares(
      List<CadastroBeneficiarioResponse> base, String cpf, String nis, String dataNascimento) {
    String cpfNormalizado = normalizarDocumento(cpf);
    String nisNormalizado = normalizarDocumento(nis);
    java.time.LocalDate dataNascimentoFiltro = parseData(dataNascimento);

    return base.stream()
        .filter(
            item ->
                cpfNormalizado == null
                    || normalizarDocumento(item.getCpf()) != null
                        && normalizarDocumento(item.getCpf()).contains(cpfNormalizado))
        .filter(
            item ->
                nisNormalizado == null
                    || normalizarDocumento(item.getNis()) != null
                        && normalizarDocumento(item.getNis()).contains(nisNormalizado))
        .filter(
            item ->
                dataNascimentoFiltro == null
                    || dataNascimentoFiltro.equals(item.getDataNascimento()))
        .collect(Collectors.toList());
  }

  private String normalizarDocumento(String valor) {
    if (valor == null) {
      return null;
    }
    String normalizado = valor.replaceAll("\\D", "");
    return normalizado.isEmpty() ? null : normalizado;
  }

  private java.time.LocalDate parseData(String dataNascimento) {
    if (dataNascimento == null || dataNascimento.trim().isEmpty()) {
      return null;
    }
    String valor = dataNascimento.trim();
    try {
      return java.time.LocalDate.parse(valor);
    } catch (Exception ex) {
      try {
        return java.time.LocalDate.parse(valor, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
      } catch (Exception ignored) {
        return null;
      }
    }
  }

  private String normalizarCodigoComparacao(String codigo) {
    String digitos = normalizarDocumento(codigo);
    if (digitos == null) {
      return null;
    }
    String semZeros = digitos.replaceFirst("^0+", "");
    return semZeros.isEmpty() ? "0" : semZeros;
  }

  private List<String> montarCodigosPesquisa(String codigo) {
    String valor = codigo == null ? "" : codigo.trim();
    if (valor.isEmpty()) {
      return List.of();
    }
    String somenteNumeros = valor.replaceAll("\\D", "");
    List<String> codigos = new java.util.ArrayList<>();
    codigos.add(valor);
    if (!somenteNumeros.isEmpty()) {
      codigos.add(somenteNumeros);
      if (somenteNumeros.length() < 4) {
        try {
          int numero = Integer.parseInt(somenteNumeros);
          codigos.add(String.format("%04d", numero));
        } catch (NumberFormatException ignored) {
          // ignora padronizacao invalida
        }
      }
    }
    return codigos.stream()
        .filter(item -> item != null && !item.trim().isEmpty())
        .distinct()
        .collect(Collectors.toList());
  }

  @Override
  public void remover(Long id) {
    CadastroBeneficiario cadastro =
        repository.buscarPorId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    repository.remover(cadastro);
  }

  @Override
  public DocumentoBeneficiario obterDocumento(Long beneficiarioId, Long documentoId) {
    DocumentoBeneficiario documento =
        documentoRepository
            .findById(documentoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (documento.getBeneficiario() == null
        || documento.getBeneficiario().getId() == null
        || !documento.getBeneficiario().getId().equals(beneficiarioId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    return documento;
  }

  @Override
  @Transactional
  public CadastroBeneficiarioResponse geocodificarEndereco(Long id, boolean forcar) {
    CadastroBeneficiario cadastro =
        repository.buscarPorId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    List<String> camposFaltantes = obterCamposEnderecoFaltantes(cadastro.getEndereco());
    if (!camposFaltantes.isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Endereco incompleto: " + String.join(", ", camposFaltantes) + ".");
    }
    CadastroBeneficiario atualizado = tentarGeocodificarEndereco(cadastro, forcar);
    if (atualizado == cadastro) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Nao foi possivel geocodificar o endereco informado.");
    }
    return CadastroBeneficiarioMapper.toResponse(atualizado);
  }

  @Override
  public CadastroBeneficiarioResponse atualizarAptidaoCestaBasica(
      Long id, AptidaoCestaBasicaRequest request) {
    CadastroBeneficiario cadastro =
        repository
            .buscarPorId(id)
            .orElseThrow(() -> new IllegalArgumentException("Beneficiario nao encontrado."));

    Boolean opta = request.getOptaReceberCestaBasica();
    Boolean apto = request.getAptoReceberCestaBasica();

    cadastro.setOptaReceberCestaBasica(opta);
    cadastro.setAptoReceberCestaBasica(Boolean.FALSE.equals(opta) ? null : apto);

    CadastroBeneficiario salvo = repository.salvar(cadastro);
    return CadastroBeneficiarioMapper.toResponse(salvo);
  }

  private void adicionarDocumentosUpload(CadastroBeneficiario cadastro, CadastroBeneficiarioCriacaoRequest request) {
    List<DocumentoUploadRequest> documentos = request.getDocumentosObrigatorios();
    if (documentos == null || documentos.isEmpty()) {
      return;
    }

    LocalDateTime agora = LocalDateTime.now();
    Map<Long, DocumentoBeneficiario> documentosPorId =
        cadastro.getDocumentos().stream()
            .filter(documento -> documento.getId() != null)
            .collect(Collectors.toMap(DocumentoBeneficiario::getId, documento -> documento, (atual, novo) -> novo));
    Map<String, DocumentoBeneficiario> documentosPorNome =
        cadastro.getDocumentos().stream()
            .filter(documento -> temTexto(documento.getNomeDocumento()))
            .collect(
                Collectors.toMap(
                    documento -> documentNameKey(documento.getNomeDocumento()),
                    documento -> documento,
                    this::escolherDocumentoMaisRecente));

    for (DocumentoUploadRequest doc : documentos) {
      if (doc == null || !temTexto(doc.getNome())) {
        continue;
      }

      DocumentoBeneficiario documento = localizarDocumentoExistente(doc, documentosPorId, documentosPorNome);
      boolean novoDocumento = documento == null;
      if (novoDocumento) {
        documento = new DocumentoBeneficiario();
        documento.setBeneficiario(cadastro);
        documento.setCriadoEm(agora);
      }

      String conteudo = doc.getConteudo();
      String caminho =
          temTexto(conteudo)
              ? armazenamentoDocumentoService.salvarArquivo(cadastro.getId(), doc)
              : primeiroValorNaoVazio(doc.getCaminhoArquivo(), documento.getCaminhoArquivo());
      String nomeArquivo = primeiroValorNaoVazio(doc.getNomeArquivo(), documento.getNomeArquivo());
      String contentType = primeiroValorNaoVazio(doc.getContentType(), documento.getContentType());

      if (!temTexto(caminho) && !temTexto(nomeArquivo)) {
        if (!novoDocumento) {
          documento.setNomeArquivo(null);
          documento.setCaminhoArquivo(null);
          documento.setContentType(null);
          documento.setAtualizadoEm(agora);
        }
        continue;
      }

      documento.setNomeDocumento(doc.getNome());
      documento.setNomeArquivo(nomeArquivo);
      documento.setContentType(contentType);
      documento.setObrigatorio(doc.getObrigatorio());
      documento.setCaminhoArquivo(caminho);
      documento.setAtualizadoEm(agora);
      if (novoDocumento) {
        cadastro.getDocumentos().add(documento);
        if (doc.getId() != null) {
          documentosPorId.put(doc.getId(), documento);
        }
        documentosPorNome.put(documentNameKey(doc.getNome()), documento);
      }
    }
  }

  private DocumentoBeneficiario localizarDocumentoExistente(
      DocumentoUploadRequest doc,
      Map<Long, DocumentoBeneficiario> documentosPorId,
      Map<String, DocumentoBeneficiario> documentosPorNome) {
    if (doc.getId() != null) {
      DocumentoBeneficiario porId = documentosPorId.get(doc.getId());
      if (porId != null) {
        return porId;
      }
    }
    String chaveNome = documentNameKey(doc.getNome());
    return chaveNome.isEmpty() ? null : documentosPorNome.get(chaveNome);
  }

  private DocumentoBeneficiario escolherDocumentoMaisRecente(
      DocumentoBeneficiario atual, DocumentoBeneficiario novo) {
    LocalDateTime atualizadaAtual = atual.getAtualizadoEm();
    LocalDateTime atualizadaNova = novo.getAtualizadoEm();
    if (atualizadaAtual == null) {
      return novo;
    }
    if (atualizadaNova == null) {
      return atual;
    }
    return atualizadaNova.isAfter(atualizadaAtual) ? novo : atual;
  }

  private String primeiroValorNaoVazio(String... valores) {
    for (String valor : valores) {
      if (temTexto(valor)) {
        return valor;
      }
    }
    return null;
  }

  private boolean temTexto(String valor) {
    return valor != null && !valor.trim().isEmpty();
  }

  private String documentNameKey(String nome) {
    return nome == null ? "" : nome.trim().toLowerCase(Locale.ROOT);
  }

  private String gerarCodigoSequencial() {
    Integer maiorCodigo = repository.buscarMaiorCodigo();
    int proximoCodigo = (maiorCodigo == null ? 0 : maiorCodigo) + 1;
    return String.format("%04d", proximoCodigo);
  }

  private CadastroBeneficiario tentarGeocodificarEndereco(CadastroBeneficiario cadastro, boolean forcar) {
    Endereco endereco = cadastro.getEndereco();
    if (endereco == null) {
      return cadastro;
    }
    if (!obterCamposEnderecoFaltantes(endereco).isEmpty()) {
      return cadastro;
    }
    if (!forcar && endereco.getLatitude() != null && endereco.getLongitude() != null) {
      return cadastro;
    }
    return geocodificacaoService
        .geocodificar(endereco)
        .map(
            coordenadas -> {
              endereco.setLatitude(coordenadas.getLatitude());
              endereco.setLongitude(coordenadas.getLongitude());
              endereco.setAtualizadoEm(LocalDateTime.now());
              cadastro.setAtualizadoEm(LocalDateTime.now());
              return repository.salvar(cadastro);
            })
        .orElse(cadastro);
  }

  private List<String> obterCamposEnderecoFaltantes(Endereco endereco) {
    if (endereco == null) {
      return List.of("endereco");
    }
    List<String> faltantes = new java.util.ArrayList<>();
    if (endereco.getLogradouro() == null || endereco.getLogradouro().trim().isEmpty()) {
      faltantes.add("logradouro");
    }
    if (endereco.getNumero() == null || endereco.getNumero().trim().isEmpty()) {
      faltantes.add("numero");
    }
    if (endereco.getCidade() == null || endereco.getCidade().trim().isEmpty()) {
      faltantes.add("cidade");
    }
    if (endereco.getEstado() == null || endereco.getEstado().trim().isEmpty()) {
      faltantes.add("estado");
    }
    return faltantes;
  }

  private void enviarEmailCadastro(CadastroBeneficiarioResponse beneficiario) {
    if (!podeEnviarEmail(beneficiario)) return;
    try {
      emailService.enviarCadastroBeneficiario(
          beneficiario.getEmail(),
          beneficiario.getNomeCompleto(),
          beneficiario.getCodigo());
    } catch (Exception ex) {
      LOGGER.warn("Envio de email de cadastro de beneficiario ignorado.", ex);
    }
  }

  private void enviarEmailAtualizacao(
      CadastroBeneficiarioResponse beneficiarioAnterior,
      CadastroBeneficiarioResponse beneficiarioAtual) {
    List<String> alteracoes = listarAlteracoesEmail(beneficiarioAnterior, beneficiarioAtual);
    if (alteracoes.isEmpty()) {
      return;
    }

    Set<String> destinatarios = obterDestinatariosEmail(beneficiarioAnterior, beneficiarioAtual);
    if (destinatarios.isEmpty()) {
      return;
    }

    try {
      for (String destinatario : destinatarios) {
        emailService.enviarAtualizacaoBeneficiario(
            destinatario,
            beneficiarioAtual.getNomeCompleto(),
            beneficiarioAtual.getCodigo(),
            alteracoes);
      }
    } catch (Exception ex) {
      LOGGER.warn("Envio de email de atualizacao de beneficiario ignorado.", ex);
    }
  }

  private boolean podeEnviarEmail(CadastroBeneficiarioResponse beneficiario) {
    if (beneficiario == null) return false;
    if (beneficiario.getPermiteContatoEmail() == null || !beneficiario.getPermiteContatoEmail()) {
      return false;
    }
    String email = beneficiario.getEmail();
    return email != null && !email.trim().isEmpty();
  }

  static List<String> listarAlteracoesEmail(
      CadastroBeneficiarioResponse anterior, CadastroBeneficiarioResponse atual) {
    if (anterior == null || atual == null) {
      return List.of();
    }

    try {
      return List.of(Introspector.getBeanInfo(CadastroBeneficiarioResponse.class, Object.class).getPropertyDescriptors())
          .stream()
          .filter(descriptor -> !CAMPOS_IGNORADOS_EMAIL.contains(descriptor.getName()))
          .sorted(Comparator.comparing(CadastroBeneficiarioServiceImpl::ordemLabelEmail))
          .map(descriptor -> montarDescricaoAlteracao(descriptor, anterior, atual))
          .filter(Objects::nonNull)
          .collect(Collectors.toList());
    } catch (IntrospectionException ex) {
      LOGGER.warn("Falha ao montar alteracoes de email do beneficiario.", ex);
      return List.of();
    }
  }

  private static String montarDescricaoAlteracao(
      PropertyDescriptor descriptor,
      CadastroBeneficiarioResponse anterior,
      CadastroBeneficiarioResponse atual) {
    try {
      Object valorAnterior = descriptor.getReadMethod().invoke(anterior);
      Object valorAtual = descriptor.getReadMethod().invoke(atual);
      String antes = formatarValorEmail(descriptor.getName(), valorAnterior);
      String depois = formatarValorEmail(descriptor.getName(), valorAtual);
      if (Objects.equals(antes, depois)) {
        return null;
      }
      return labelEmail(descriptor.getName())
          + ": de \""
          + antes
          + "\" para \""
          + depois
          + "\".";
    } catch (Exception ex) {
      LOGGER.debug("Falha ao comparar campo {} do beneficiario.", descriptor.getName(), ex);
      return null;
    }
  }

  private Set<String> obterDestinatariosEmail(
      CadastroBeneficiarioResponse beneficiarioAnterior,
      CadastroBeneficiarioResponse beneficiarioAtual) {
    LinkedHashSet<String> destinatarios = new LinkedHashSet<>();
    adicionarDestinatarioEmail(destinatarios, beneficiarioAtual);
    adicionarDestinatarioEmail(destinatarios, beneficiarioAnterior);
    return destinatarios;
  }

  private void adicionarDestinatarioEmail(
      Set<String> destinatarios, CadastroBeneficiarioResponse beneficiario) {
    if (!podeEnviarEmail(beneficiario)) {
      return;
    }
    destinatarios.add(beneficiario.getEmail().trim().toLowerCase(Locale.ROOT));
  }

  private static Map<String, String> criarLabelsEmail() {
    Map<String, String> labels = new LinkedHashMap<>();
    labels.put("codigo", "Código");
    labels.put("nomeCompleto", "Nome completo");
    labels.put("nomeSocial", "Nome social");
    labels.put("apelido", "Apelido");
    labels.put("dataNascimento", "Data de nascimento");
    labels.put("foto3x4", "Foto 3x4");
    labels.put("sexoBiologico", "Sexo biológico");
    labels.put("corRaca", "Cor ou raça");
    labels.put("estadoCivil", "Estado civil");
    labels.put("nacionalidade", "Nacionalidade");
    labels.put("naturalidadeCidade", "Naturalidade cidade");
    labels.put("naturalidadeUf", "Naturalidade UF");
    labels.put("nomeMae", "Nome da mãe");
    labels.put("nomePai", "Nome do pai");
    labels.put("status", "Status");
    labels.put("optaReceberCestaBasica", "Opta receber cesta básica");
    labels.put("aptoReceberCestaBasica", "Apto receber cesta básica");
    labels.put("cep", "CEP");
    labels.put("logradouro", "Logradouro");
    labels.put("numero", "Número");
    labels.put("complemento", "Complemento");
    labels.put("bairro", "Bairro");
    labels.put("pontoReferencia", "Ponto de referência");
    labels.put("municipio", "Município");
    labels.put("zona", "Zona");
    labels.put("subzona", "Subzona");
    labels.put("uf", "UF");
    labels.put("latitude", "Latitude");
    labels.put("longitude", "Longitude");
    labels.put("telefonePrincipal", "Telefone principal");
    labels.put("telefonePrincipalWhatsapp", "Telefone principal WhatsApp");
    labels.put("telefoneSecundario", "Telefone secundário");
    labels.put("telefoneRecadoNome", "Telefone recado nome");
    labels.put("telefoneRecadoNumero", "Telefone recado número");
    labels.put("email", "E-mail");
    labels.put("permiteContatoTel", "Permite contato por telefone");
    labels.put("permiteContatoWhatsapp", "Permite contato por WhatsApp");
    labels.put("permiteContatoSms", "Permite contato por SMS");
    labels.put("permiteContatoEmail", "Permite contato por e-mail");
    labels.put("horarioPreferencialContato", "Horário preferencial de contato");
    labels.put("cpf", "CPF");
    labels.put("rgNumero", "RG número");
    labels.put("rgOrgaoEmissor", "RG órgão emissor");
    labels.put("rgUf", "RG UF");
    labels.put("rgDataEmissao", "RG data de emissão");
    labels.put("nis", "NIS");
    labels.put("certidaoTipo", "Certidão tipo");
    labels.put("certidaoLivro", "Certidão livro");
    labels.put("certidaoFolha", "Certidão folha");
    labels.put("certidaoTermo", "Certidão termo");
    labels.put("certidaoCartorio", "Certidão cartório");
    labels.put("certidaoMunicipio", "Certidão município");
    labels.put("certidaoUf", "Certidão UF");
    labels.put("tituloEleitor", "Título de eleitor");
    labels.put("cnh", "CNH");
    labels.put("cartaoSus", "Cartão SUS");
    labels.put("moraComFamilia", "Mora com família");
    labels.put("responsavelLegal", "Responsável legal");
    labels.put("vinculoFamiliar", "Vínculo familiar");
    labels.put("situacaoVulnerabilidade", "Situação de vulnerabilidade");
    labels.put("composicaoFamiliar", "Composição familiar");
    labels.put("criancasAdolescentes", "Crianças e adolescentes");
    labels.put("idosos", "Idosos");
    labels.put("acompanhamentoCras", "Acompanhamento CRAS");
    labels.put("acompanhamentoSaude", "Acompanhamento saúde");
    labels.put("participaComunidade", "Participa comunidade");
    labels.put("redeApoio", "Rede de apoio");
    labels.put("sabeLerEscrever", "Sabe ler e escrever");
    labels.put("nivelEscolaridade", "Nível de escolaridade");
    labels.put("estudaAtualmente", "Estuda atualmente");
    labels.put("ocupacao", "Ocupação");
    labels.put("situacaoTrabalho", "Situação de trabalho");
    labels.put("localTrabalho", "Local de trabalho");
    labels.put("rendaMensal", "Renda mensal");
    labels.put("fonteRenda", "Fonte de renda");
    labels.put("possuiDeficiencia", "Possui deficiência");
    labels.put("tipoDeficiencia", "Tipo de deficiência");
    labels.put("cidPrincipal", "CID principal");
    labels.put("usaMedicacaoContinua", "Usa medicação contínua");
    labels.put("descricaoMedicacao", "Descrição da medicação");
    labels.put("servicoSaudeReferencia", "Serviço de saúde de referência");
    labels.put("recebeBeneficio", "Recebe benefício");
    labels.put("beneficiosDescricao", "Benefícios descrição");
    labels.put("valorTotalBeneficios", "Valor total benefícios");
    labels.put("beneficiosRecebidos", "Benefícios recebidos");
    labels.put("aceiteLgpd", "Aceite LGPD");
    labels.put("dataAceiteLgpd", "Data aceite LGPD");
    labels.put("observacoes", "Observações");
    labels.put("documentosObrigatorios", "Documentos obrigatórios");
    return labels;
  }

  private static String ordemLabelEmail(PropertyDescriptor descriptor) {
    return labelEmail(descriptor.getName());
  }

  private static String labelEmail(String propriedade) {
    return LABELS_EMAIL.getOrDefault(propriedade, humanizarNomeCampo(propriedade));
  }

  private static String formatarValorEmail(String propriedade, Object valor) {
    if (valor == null) {
      return "Não informado";
    }
    if (valor instanceof String texto) {
      String normalizado = texto.trim();
      return normalizado.isEmpty() ? "Não informado" : normalizado;
    }
    if (valor instanceof Boolean booleano) {
      return Boolean.TRUE.equals(booleano) ? "Sim" : "Não";
    }
    if (valor instanceof LocalDate data) {
      return data.format(DATA_UI);
    }
    if (valor instanceof LocalDateTime dataHora) {
      return dataHora.format(DATA_HORA_UI);
    }
    if ("documentosObrigatorios".equals(propriedade) && valor instanceof List<?> listaDocumentos) {
      return formatarDocumentosEmail(listaDocumentos);
    }
    if (valor instanceof List<?> lista) {
      List<String> itens =
          lista.stream()
              .filter(Objects::nonNull)
              .map(String::valueOf)
              .map(String::trim)
              .filter(item -> !item.isEmpty())
              .sorted()
              .collect(Collectors.toList());
      return itens.isEmpty() ? "Não informado" : String.join(", ", itens);
    }
    return String.valueOf(valor);
  }

  private static String formatarDocumentosEmail(List<?> listaDocumentos) {
    List<String> documentos =
        listaDocumentos.stream()
            .filter(DocumentoBeneficiarioResponse.class::isInstance)
            .map(DocumentoBeneficiarioResponse.class::cast)
            .map(CadastroBeneficiarioServiceImpl::formatarDocumentoEmail)
            .filter(item -> item != null && !item.isBlank())
            .sorted()
            .collect(Collectors.toList());
    return documentos.isEmpty() ? "Não informado" : String.join(", ", documentos);
  }

  private static String formatarDocumentoEmail(DocumentoBeneficiarioResponse documento) {
    if (documento == null) {
      return null;
    }
    String nome = documento.getNome() == null ? "" : documento.getNome().trim();
    String nomeArquivo =
        documento.getNomeArquivo() == null ? "" : documento.getNomeArquivo().trim();
    if (nome.isEmpty() && nomeArquivo.isEmpty()) {
      return null;
    }
    if (nome.isEmpty()) {
      return nomeArquivo;
    }
    if (nomeArquivo.isEmpty()) {
      return nome;
    }
    return nome + " (" + nomeArquivo + ")";
  }

  private static String humanizarNomeCampo(String nomeCampo) {
    if (nomeCampo == null || nomeCampo.isBlank()) {
      return "Campo";
    }
    String texto = nomeCampo.replaceAll("([a-z])([A-Z])", "$1 $2").trim();
    if (texto.isEmpty()) {
      return "Campo";
    }
    return Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
  }
}
