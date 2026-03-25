package br.com.g3.recebimentodoacao.serviceimpl;

import br.com.g3.auditoria.service.AuditoriaService;
import br.com.g3.almoxarifado.domain.AlmoxarifadoItem;
import br.com.g3.almoxarifado.domain.AlmoxarifadoMovimentacao;
import br.com.g3.almoxarifado.repository.AlmoxarifadoRepository;
import br.com.g3.contabilidade.domain.ContaBancaria;
import br.com.g3.contabilidade.dto.MovimentacaoFinanceiraRequest;
import br.com.g3.contabilidade.repository.ContaBancariaRepository;
import br.com.g3.contabilidade.repository.MovimentacaoFinanceiraRepository;
import br.com.g3.contabilidade.service.ContabilidadeService;
import br.com.g3.patrimonio.domain.PatrimonioItem;
import br.com.g3.patrimonio.repository.PatrimonioRepository;
import br.com.g3.recebimentodoacao.domain.Doador;
import br.com.g3.recebimentodoacao.domain.RecebimentoDoacao;
import br.com.g3.recebimentodoacao.domain.RecebimentoDoacaoItem;
import br.com.g3.recebimentodoacao.dto.DoadorRequest;
import br.com.g3.recebimentodoacao.dto.DoadorResponse;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoItemRequest;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoListaResponse;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoRequest;
import br.com.g3.recebimentodoacao.dto.RecebimentoDoacaoResponse;
import br.com.g3.recebimentodoacao.mapper.RecebimentoDoacaoMapper;
import br.com.g3.recebimentodoacao.repository.DoadorRepository;
import br.com.g3.recebimentodoacao.repository.RecebimentoDoacaoRepository;
import br.com.g3.recebimentodoacao.service.RecebimentoDoacaoService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RecebimentoDoacaoServiceImpl implements RecebimentoDoacaoService {
  private final DoadorRepository doadorRepository;
  private final RecebimentoDoacaoRepository recebimentoRepository;
  private final ContabilidadeService contabilidadeService;
  private final ContaBancariaRepository contaBancariaRepository;
  private final MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository;
  private final AlmoxarifadoRepository almoxarifadoRepository;
  private final PatrimonioRepository patrimonioRepository;
  private final AuditoriaService auditoriaService;
  private final RecebimentoDoacaoMapper mapper = new RecebimentoDoacaoMapper();

  public RecebimentoDoacaoServiceImpl(
      DoadorRepository doadorRepository,
      RecebimentoDoacaoRepository recebimentoRepository,
      ContabilidadeService contabilidadeService,
      ContaBancariaRepository contaBancariaRepository,
      MovimentacaoFinanceiraRepository movimentacaoFinanceiraRepository,
      AlmoxarifadoRepository almoxarifadoRepository,
      PatrimonioRepository patrimonioRepository,
      AuditoriaService auditoriaService) {
    this.doadorRepository = doadorRepository;
    this.recebimentoRepository = recebimentoRepository;
    this.contabilidadeService = contabilidadeService;
    this.contaBancariaRepository = contaBancariaRepository;
    this.movimentacaoFinanceiraRepository = movimentacaoFinanceiraRepository;
    this.almoxarifadoRepository = almoxarifadoRepository;
    this.patrimonioRepository = patrimonioRepository;
    this.auditoriaService = auditoriaService;
  }

  @Override
  @Transactional
  public DoadorResponse criarDoador(DoadorRequest request) {
    Doador doador = mapper.toDoador(request);
    LocalDateTime now = LocalDateTime.now();
    doador.setCriadoEm(now);
    doador.setAtualizadoEm(now);
    return mapper.toDoadorResponse(doadorRepository.salvar(doador));
  }

  @Override
  public List<DoadorResponse> listarDoadores() {
    List<DoadorResponse> responses = new ArrayList<DoadorResponse>();
    for (Doador doador : doadorRepository.listar()) {
      responses.add(mapper.toDoadorResponse(doador));
    }
    return responses;
  }

  @Override
  @Transactional
  public void excluirDoador(Long id) {
    Doador doador =
        doadorRepository
            .buscarPorId(id)
            .orElseThrow(() -> new IllegalArgumentException("Doador nao encontrado"));
    doadorRepository.remover(doador);
  }

  @Override
  @Transactional
  public RecebimentoDoacaoResponse criarRecebimento(RecebimentoDoacaoRequest request) {
    RecebimentoDoacao recebimento = new RecebimentoDoacao();
    mapper.applyRecebimento(recebimento, request);
    aplicarItens(recebimento, request);
    if (request.getDoadorId() != null) {
      Optional<Doador> doador = doadorRepository.buscarPorId(request.getDoadorId());
      if (doador.isPresent()) {
        recebimento.setDoador(doador.get());
      }
    }
    LocalDateTime now = LocalDateTime.now();
    recebimento.setCriadoEm(now);
    recebimento.setAtualizadoEm(now);
    recebimento.setContabilidadePendente("RECEBIDA".equalsIgnoreCase(request.getStatus()));
    RecebimentoDoacao salvo = recebimentoRepository.salvar(recebimento);
    gerarLancamentosAutomaticos(salvo);
    return mapper.toRecebimentoResponse(salvo);
  }

  @Override
  @Transactional(readOnly = true)
  public RecebimentoDoacaoListaResponse listarRecebimentos() {
    List<RecebimentoDoacaoResponse> responses = new ArrayList<RecebimentoDoacaoResponse>();
    for (RecebimentoDoacao recebimento : recebimentoRepository.listar()) {      
      responses.add(mapper.toRecebimentoResponse(recebimento));
    }
    return new RecebimentoDoacaoListaResponse(responses);
  }

  @Override
  @Transactional
  public RecebimentoDoacaoResponse atualizarRecebimento(Long id, RecebimentoDoacaoRequest request) {
    RecebimentoDoacao recebimento =
        recebimentoRepository.buscarPorId(id)
            .orElseThrow(() -> new IllegalArgumentException("Recebimento nao encontrado"));
    mapper.applyRecebimento(recebimento, request);
    aplicarItens(recebimento, request);
    if (request.getDoadorId() != null) {
      Optional<Doador> doador = doadorRepository.buscarPorId(request.getDoadorId());
      doador.ifPresent(recebimento::setDoador);
    }
    recebimento.setAtualizadoEm(LocalDateTime.now());
    recebimento.setContabilidadePendente("RECEBIDA".equalsIgnoreCase(request.getStatus()));
    RecebimentoDoacao salvo = recebimentoRepository.salvar(recebimento);
    gerarLancamentosAutomaticos(salvo);
    return mapper.toRecebimentoResponse(salvo);
  }

  @Override
  @Transactional
  public void excluirRecebimento(Long id) {
    RecebimentoDoacao recebimento =
        recebimentoRepository.buscarPorId(id)
            .orElseThrow(() -> new IllegalArgumentException("Recebimento nao encontrado"));
    recebimentoRepository.remover(recebimento);
  }

  private void aplicarItens(RecebimentoDoacao recebimento, RecebimentoDoacaoRequest request) {
    List<RecebimentoDoacaoItem> itens = new ArrayList<>();
    List<RecebimentoDoacaoItemRequest> itensRequest = request.getItens();
    if (itensRequest != null) {
      for (RecebimentoDoacaoItemRequest itemRequest : itensRequest) {
        RecebimentoDoacaoItem item = mapItem(recebimento, itemRequest);
        if (item != null) {
          itens.add(item);
        }
      }
    }

    if (itens.isEmpty() && isTipoItens(recebimento.getTipoDoacao())) {
      RecebimentoDoacaoItemRequest unico = new RecebimentoDoacaoItemRequest();
      unico.setDescricao(request.getDescricao());
      unico.setQuantidade(request.getQuantidadeItens());
      unico.setValorUnitario(request.getValorMedio());
      unico.setValorTotal(request.getValorTotal());
      RecebimentoDoacaoItem item = mapItem(recebimento, unico);
      if (item != null) {
        itens.add(item);
      }
    }

    recebimento.getItens().clear();
    recebimento.getItens().addAll(itens);
  }

  private RecebimentoDoacaoItem mapItem(
      RecebimentoDoacao recebimento, RecebimentoDoacaoItemRequest itemRequest) {
    if (itemRequest == null) {
      return null;
    }
    String descricao = normalizarTexto(itemRequest.getDescricao());
    Integer quantidade = itemRequest.getQuantidade();
    if (descricao.isEmpty()) {
      return null;
    }
    if (quantidade == null || quantidade <= 0) {
      quantidade = 1;
    }
    RecebimentoDoacaoItem item = new RecebimentoDoacaoItem();
    item.setRecebimentoDoacao(recebimento);
    item.setDescricao(descricao);
    item.setQuantidade(quantidade);
    item.setUnidade(normalizarTexto(itemRequest.getUnidade()));
    item.setValorUnitario(itemRequest.getValorUnitario());
    item.setValorTotal(itemRequest.getValorTotal());
    item.setMarca(normalizarTexto(itemRequest.getMarca()));
    item.setModelo(normalizarTexto(itemRequest.getModelo()));
    item.setConservacao(normalizarTexto(itemRequest.getConservacao()));
    item.setObservacoes(normalizarTexto(itemRequest.getObservacoes()));
    item.setCriadoEm(LocalDateTime.now());
    return item;
  }

  private void gerarLancamentosAutomaticos(RecebimentoDoacao recebimento) {
    if (recebimento == null || recebimento.getId() == null) {
      return;
    }
    if (!"RECEBIDA".equalsIgnoreCase(recebimento.getStatus())) {
      return;
    }
    if (recebimento.isLancamentosGerados() || existeLancamentoParaDoacao(recebimento.getId())) {
      recebimento.setLancamentosGerados(true);
      return;
    }

    String destino = classificarDestinoOperacional(recebimento);
    if ("contabilidade".equals(destino)) {
      gerarMovimentacaoFinanceira(recebimento);
    } else if ("almoxarifado".equals(destino)) {
      gerarMovimentacaoAlmoxarifado(recebimento);
    } else if ("patrimonio".equals(destino)) {
      gerarPatrimonio(recebimento);
    }

    recebimento.setLancamentosGerados(true);
    recebimento.setAtualizadoEm(LocalDateTime.now());
    recebimentoRepository.salvar(recebimento);
    registrarAuditoria(recebimento);
  }

  private void gerarMovimentacaoFinanceira(RecebimentoDoacao recebimento) {
    ContaBancaria conta = resolverContaRecebimento(recebimento);

    BigDecimal valor = recebimento.getValor();
    if (valor == null) {
      valor = recebimento.getValorTotal();
    }
    if (valor == null) {
      valor = BigDecimal.ZERO;
    }

    MovimentacaoFinanceiraRequest request = new MovimentacaoFinanceiraRequest();
    request.setTipo("Entrada");
    request.setDescricao(gerarDescricaoDoacao(recebimento));
    request.setContraparte(obterNomeDoador(recebimento));
    request.setCategoria("Doacao");
    request.setContaBancariaId(conta.getId());
    request.setDataMovimentacao(recebimento.getDataRecebimento());
    request.setValor(valor);
    request.setDoacaoId(recebimento.getId());
    contabilidadeService.criarMovimentacao(request);
  }

  private ContaBancaria resolverContaRecebimento(RecebimentoDoacao recebimento) {
    Long contaId = recebimento.getContaRecebimentoId();
    if (contaId != null) {
      ContaBancaria conta =
          contaBancariaRepository
              .buscarPorId(contaId)
              .orElseThrow(
                  () ->
                      new ResponseStatusException(
                          org.springframework.http.HttpStatus.BAD_REQUEST,
                          "Conta de recebimento local nao encontrada."));
      if (!Boolean.TRUE.equals(conta.getRecebimentoLocal())) {
        throw new ResponseStatusException(
            org.springframework.http.HttpStatus.BAD_REQUEST,
            "Conta selecionada nao esta marcada como recebimento local.");
      }
      return conta;
    }

    List<ContaBancaria> contas = contaBancariaRepository.listarRecebimentoLocal();
    if (contas.isEmpty()) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Conta de recebimento local nao configurada.");
    }
    if (contas.size() > 1) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Existe mais de uma conta marcada como recebimento local. Selecione a conta desejada.");
    }
    return contas.get(0);
  }

  private void gerarMovimentacaoAlmoxarifado(RecebimentoDoacao recebimento) {
    List<RecebimentoDoacaoItem> itens = recebimento.getItens();
    if (itens == null || itens.isEmpty()) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Informe os itens da doacao para gerar entrada no almoxarifado.");
    }
    for (RecebimentoDoacaoItem itemDoacao : itens) {
      AlmoxarifadoItem item = obterOuCriarItemAlmoxarifado(recebimento, itemDoacao);
      registrarEntradaAlmoxarifado(recebimento, item, itemDoacao.getQuantidade());
    }
  }

  private AlmoxarifadoItem obterOuCriarItemAlmoxarifado(
      RecebimentoDoacao recebimento, RecebimentoDoacaoItem itemDoacao) {
    String descricao = normalizarTexto(itemDoacao.getDescricao());
    String categoria = normalizarCategoria(recebimento.getTipoDoacao());
    String unidade = normalizarTexto(itemDoacao.getUnidade());
    if (unidade.isEmpty()) {
      unidade = "UN";
    }

    Optional<AlmoxarifadoItem> existente =
        almoxarifadoRepository.buscarItemDuplicado(descricao, categoria, unidade, null, null);
    if (existente.isPresent()) {
      return existente.get();
    }

    AlmoxarifadoItem novo = new AlmoxarifadoItem();
    novo.setCodigo(gerarCodigoAlmoxarifado());
    novo.setDescricao(descricao);
    novo.setCategoria(categoria);
    novo.setUnidade(unidade);
    novo.setEstoqueAtual(0);
    novo.setEstoqueMinimo(0);
    BigDecimal valorUnitario = itemDoacao.getValorUnitario();
    if (valorUnitario == null && itemDoacao.getValorTotal() != null && itemDoacao.getQuantidade() != null
        && itemDoacao.getQuantidade() > 0) {
      valorUnitario = itemDoacao.getValorTotal().divide(BigDecimal.valueOf(itemDoacao.getQuantidade()));
    }
    novo.setValorUnitario(valorUnitario != null ? valorUnitario : BigDecimal.ZERO);
    novo.setIsKit(false);
    novo.setSituacao("Ativo");
    novo.setIgnorarValidade(true);
    novo.setObservacoes("Item criado a partir da doacao " + recebimento.getId());
    novo.setCriadoEm(LocalDateTime.now());
    novo.setAtualizadoEm(LocalDateTime.now());
    return almoxarifadoRepository.salvarItem(novo);
  }

  private void registrarEntradaAlmoxarifado(
      RecebimentoDoacao recebimento, AlmoxarifadoItem item, Integer quantidade) {
    int saldoAtual = item.getEstoqueAtual() != null ? item.getEstoqueAtual() : 0;
    int quantidadeMov = quantidade != null ? quantidade : 0;
    int saldoApos = saldoAtual + quantidadeMov;
    item.setEstoqueAtual(saldoApos);
    AlmoxarifadoItem salvo = almoxarifadoRepository.salvarItem(item);

    AlmoxarifadoMovimentacao movimento = new AlmoxarifadoMovimentacao();
    movimento.setItem(salvo);
    movimento.setDataMovimentacao(recebimento.getDataRecebimento());
    movimento.setTipo("Entrada");
    movimento.setQuantidade(quantidadeMov);
    movimento.setSaldoApos(saldoApos);
    movimento.setReferencia("Doacao " + recebimento.getId());
    movimento.setResponsavel(obterNomeDoador(recebimento));
    movimento.setObservacoes(gerarDescricaoDoacao(recebimento));
    movimento.setDoacaoId(recebimento.getId());
    movimento.setCriadoEm(LocalDateTime.now());
    almoxarifadoRepository.salvarMovimentacao(movimento);
  }

  private void gerarPatrimonio(RecebimentoDoacao recebimento) {
    List<RecebimentoDoacaoItem> itens = recebimento.getItens();
    if (itens == null || itens.isEmpty()) {
      throw new ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Informe os bens da doacao para gerar patrimonio.");
    }
    int indice = 1;
    for (RecebimentoDoacaoItem itemDoacao : itens) {
      int quantidade = itemDoacao.getQuantidade() != null ? itemDoacao.getQuantidade() : 1;
      for (int i = 0; i < Math.max(1, quantidade); i += 1) {
        PatrimonioItem item = new PatrimonioItem();
        item.setNumeroPatrimonio(gerarNumeroPatrimonio(recebimento.getId(), indice++));
        item.setNome(itemDoacao.getDescricao());
        item.setCategoria("Doacao");
        item.setConservacao(normalizarTexto(itemDoacao.getConservacao()));
        item.setStatus("Ativo");
        item.setDataAquisicao(recebimento.getDataRecebimento());
        item.setValorAquisicao(itemDoacao.getValorUnitario());
        item.setOrigem("Doacao");
        item.setObservacoes(gerarDescricaoDoacao(recebimento));
        item.setDoacaoId(recebimento.getId());
        patrimonioRepository.salvar(item);
      }
    }
  }

  private boolean existeLancamentoParaDoacao(Long doacaoId) {
    if (doacaoId == null) {
      return false;
    }
    return movimentacaoFinanceiraRepository.existePorDoacaoId(doacaoId)
        || almoxarifadoRepository.existeMovimentacaoPorDoacaoId(doacaoId)
        || patrimonioRepository.existePorDoacaoId(doacaoId);
  }

  private boolean isTipoItens(String tipo) {
    String lower = normalizarTexto(tipo).toLowerCase();
    return lower.contains("alimentos")
        || lower.contains("industrializados")
        || lower.contains("materiais")
        || lower.contains("bens")
        || lower.contains("bens de consumo")
        || lower.contains("bens permanentes")
        || lower.contains("doação de bens de consumo")
        || lower.contains("doacao de bens de consumo")
        || lower.contains("doação de bens permanentes")
        || lower.contains("doacao de bens permanentes");
  }

  private String classificarDestinoOperacional(RecebimentoDoacao recebimento) {
    String tipo = normalizarTexto(recebimento.getTipoDoacao()).toLowerCase();

    if (tipo.contains("doação financeira")
        || tipo.contains("doacao financeira")
        || tipo.contains("dinheiro")
        || tipo.contains("doação por campanhas")
        || tipo.contains("doacao por campanhas")
        || tipo.contains("doação recorrente")
        || tipo.contains("doacao recorrente")
        || tipo.contains("doação para eventos")
        || tipo.contains("doacao para eventos")
        || tipo.contains("doação incentivada")
        || tipo.contains("doacao incentivada")) {
      return "contabilidade";
    }

    if (tipo.contains("doação de bens de consumo")
        || tipo.contains("doacao de bens de consumo")
        || tipo.contains("alimentos")
        || tipo.contains("industrializados")
        || tipo.contains("materiais")
        || tipo.contains("roupas")
        || tipo.contains("higiene")
        || tipo.contains("brinquedos")) {
      return "almoxarifado";
    }

    if (tipo.contains("doação de bens permanentes")
        || tipo.contains("doacao de bens permanentes")
        || tipo.contains("bens")) {
      return "patrimonio";
    }

    return "";
  }

  private String gerarDescricaoDoacao(RecebimentoDoacao recebimento) {
    StringBuilder sb = new StringBuilder("Doacao ");
    sb.append(recebimento.getId());
    String doador = obterNomeDoador(recebimento);
    if (!doador.isEmpty()) {
      sb.append(" - ").append(doador);
    }
    String observacao = normalizarTexto(recebimento.getObservacoes());
    if (!observacao.isEmpty()) {
      sb.append(" - ").append(observacao);
    }
    String descricao = sb.toString();
    return descricao.length() > 200 ? descricao.substring(0, 200) : descricao;
  }

  private String obterNomeDoador(RecebimentoDoacao recebimento) {
    return recebimento.getDoador() != null && recebimento.getDoador().getNome() != null
        ? recebimento.getDoador().getNome()
        : "";
  }

  private String gerarCodigoAlmoxarifado() {
    int proximo = almoxarifadoRepository.obterProximoCodigo();
    return String.format("%04d", proximo);
  }

  private String gerarNumeroPatrimonio(Long doacaoId, int indice) {
    return String.format("DOA-%d-%03d", doacaoId, indice);
  }

  private String normalizarCategoria(String tipoDoacao) {
    String tipo = normalizarTexto(tipoDoacao);
    return tipo.isEmpty() ? "Doacao" : tipo;
  }

  private String normalizarTexto(String texto) {
    return texto == null ? "" : texto.trim();
  }

  private void registrarAuditoria(RecebimentoDoacao recebimento) {
    if (auditoriaService == null || recebimento == null) {
      return;
    }
    String id = recebimento.getId() != null ? recebimento.getId().toString() : UUID.randomUUID().toString();
    auditoriaService.registrarEvento(
        "Lancamento automatico gerado a partir da doacao " + recebimento.getId(),
        "recebimento_doacao",
        id,
        null,
        null);
  }
}
