package br.com.g3.manualsistema.serviceimpl;

import br.com.g3.manualsistema.domain.ManualSistemaMudanca;
import br.com.g3.manualsistema.domain.ManualSistemaSecao;
import br.com.g3.manualsistema.dto.ManualSistemaMudancaListaResponse;
import br.com.g3.manualsistema.dto.ManualSistemaMudancaRequest;
import br.com.g3.manualsistema.dto.ManualSistemaMudancaResponse;
import br.com.g3.manualsistema.dto.ManualSistemaResumoResponse;
import br.com.g3.manualsistema.dto.ManualSistemaSecaoResponse;
import br.com.g3.manualsistema.dto.ManualSistemaSecaoResumoResponse;
import br.com.g3.manualsistema.repository.ManualSistemaMudancaRepository;
import br.com.g3.manualsistema.repository.ManualSistemaSecaoRepository;
import br.com.g3.manualsistema.service.ManualSistemaService;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ManualSistemaServiceImpl implements ManualSistemaService {
  private static final int LIMITE_PADRAO = 10;
  private static final String SLUG_CHANGES = "o-que-mudou";
  private static final DateTimeFormatter FORMATADOR_DATA =
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

  private final ManualSistemaSecaoRepository secaoRepository;
  private final ManualSistemaMudancaRepository mudancaRepository;

  public ManualSistemaServiceImpl(
      ManualSistemaSecaoRepository secaoRepository,
      ManualSistemaMudancaRepository mudancaRepository) {
    this.secaoRepository = secaoRepository;
    this.mudancaRepository = mudancaRepository;
  }

  @Override
  public ManualSistemaResumoResponse obterResumo() {
    List<ManualSistemaSecao> secoes = secaoRepository.listarOrdenado();
    List<ManualSistemaSecaoResumoResponse> resumo =
        secoes.stream().map(this::toResumo).collect(Collectors.toList());

    LocalDateTime ultimaAtualizacao =
        secoes.stream()
            .map(ManualSistemaSecao::getAtualizadoEm)
            .filter(data -> data != null)
            .max(Comparator.naturalOrder())
            .orElse(null);
    Optional<LocalDateTime> ultimaMudanca = mudancaRepository.buscarUltimaMudanca();
    if (ultimaMudanca.isPresent()
        && (ultimaAtualizacao == null || ultimaMudanca.get().isAfter(ultimaAtualizacao))) {
      ultimaAtualizacao = ultimaMudanca.get();
    }

    return new ManualSistemaResumoResponse(resumo, ultimaAtualizacao);
  }

  @Override
  public ManualSistemaSecaoResponse obterSecao(String slug) {
    ManualSistemaSecao secao =
        secaoRepository
            .buscarPorSlug(slug)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Secao nao encontrada."));
    return toSecao(secao);
  }

  @Override
  public ManualSistemaMudancaListaResponse listarMudancas(int limite) {
    int tamanho = limite > 0 ? limite : LIMITE_PADRAO;
    List<ManualSistemaMudancaResponse> mudancas =
        mudancaRepository.listarRecentes(tamanho).stream().map(this::toMudanca).toList();
    return new ManualSistemaMudancaListaResponse(mudancas);
  }

  @Override
  public ManualSistemaMudancaResponse registrarMudanca(ManualSistemaMudancaRequest request) {
    ManualSistemaMudanca mudanca = new ManualSistemaMudanca();
    LocalDateTime agora = LocalDateTime.now();
    mudanca.setDataMudanca(request.getDataMudanca() != null ? request.getDataMudanca() : agora);
    mudanca.setAutor(textoSeguro(request.getAutor()));
    mudanca.setModulo(textoSeguro(request.getModulo()));
    mudanca.setTela(textoSeguro(request.getTela()));
    mudanca.setTipo(textoSeguro(request.getTipo()));
    mudanca.setDescricaoCurta(textoSeguro(request.getDescricaoCurta()));
    mudanca.setDescricaoDetalhada(textoSeguro(request.getDescricaoDetalhada()));
    mudanca.setVersaoBuild(textoSeguro(request.getVersaoBuild()));
    mudanca.setLinks(textoSeguro(request.getLinks()));
    mudanca.setCriadoEm(agora);
    ManualSistemaMudanca salva = mudancaRepository.salvar(mudanca);

    atualizarManualComMudanca(salva);

    return toMudanca(salva);
  }

  private void atualizarManualComMudanca(ManualSistemaMudanca mudanca) {
    atualizarChangelog(mudanca);
    if (mudanca.getTela() != null && !mudanca.getTela().isBlank()) {
      atualizarSecaoTela(mudanca);
    }
  }

  private void atualizarChangelog(ManualSistemaMudanca mudanca) {
    List<ManualSistemaMudanca> recentes = mudancaRepository.listarRecentes(LIMITE_PADRAO);
    String conteudo = gerarHtmlChangelog(recentes);
    ManualSistemaSecao secao =
        secaoRepository
            .buscarPorSlug(SLUG_CHANGES)
            .orElseGet(() -> criarSecaoChangelog());
    secao.setConteudo(conteudo);
    secao.setAtualizadoEm(LocalDateTime.now());
    secao.setAtualizadoPor(mudanca.getAutor());
    secaoRepository.salvar(secao);
  }

  private void atualizarSecaoTela(ManualSistemaMudanca mudanca) {
    String slug = slugify(mudanca.getTela());
    ManualSistemaSecao secao =
        secaoRepository
            .buscarPorSlug(slug)
            .orElseGet(() -> criarSecaoTela(slug, mudanca.getTela()));
    String conteudoAtualizado = adicionarAtualizacaoNoConteudo(secao.getConteudo(), mudanca);
    secao.setConteudo(conteudoAtualizado);
    secao.setAtualizadoEm(LocalDateTime.now());
    secao.setAtualizadoPor(mudanca.getAutor());
    secaoRepository.salvar(secao);
  }

  private ManualSistemaSecao criarSecaoChangelog() {
    ManualSistemaSecao secao = new ManualSistemaSecao();
    secao.setSlug(SLUG_CHANGES);
    secao.setTitulo("O que mudou");
    secao.setOrdem(900);
    secao.setTags("changelog,atualizacoes");
    secao.setAtualizadoEm(LocalDateTime.now());
    secao.setAtualizadoPor("Sistema");
    return secao;
  }

  private ManualSistemaSecao criarSecaoTela(String slug, String tela) {
    ManualSistemaSecao secao = new ManualSistemaSecao();
    secao.setSlug(slug);
    secao.setTitulo(tela);
    secao.setOrdem(700);
    secao.setTags("tela,atualizacoes");
    String conteudo =
        "<h3>Objetivo da tela</h3><p>Descreva o objetivo principal desta tela.</p>"
            + "<h3>Passo a passo</h3><ol><li>Defina o fluxo principal.</li></ol>"
            + "<h3>Atualizacoes recentes</h3>"
            + "<ul data-manual-atualizacoes></ul>";
    secao.setConteudo(conteudo);
    secao.setAtualizadoEm(LocalDateTime.now());
    secao.setAtualizadoPor("Sistema");
    return secao;
  }

  private String gerarHtmlChangelog(List<ManualSistemaMudanca> mudancas) {
    String itens =
        mudancas.stream()
            .map(
                mudanca ->
                    "<li>"
                        + "<strong>"
                        + formatarData(mudanca.getDataMudanca())
                        + "</strong> - "
                        + escaparHtml(textoSeguro(mudanca.getDescricaoCurta()))
                        + (mudanca.getTela() != null && !mudanca.getTela().isBlank()
                            ? " <em>(" + escaparHtml(textoSeguro(mudanca.getTela())) + ")</em>"
                            : "")
                        + "</li>")
            .collect(Collectors.joining());
    return "<p>Ultimas atualizacoes registradas automaticamente.</p>"
        + "<ul data-manual-changelog>"
        + itens
        + "</ul>";
  }

  private String adicionarAtualizacaoNoConteudo(String conteudo, ManualSistemaMudanca mudanca) {
    String item =
        "<li><strong>"
            + formatarData(mudanca.getDataMudanca())
            + "</strong> - "
            + escaparHtml(textoSeguro(mudanca.getDescricaoCurta()))
            + "</li>";
    if (conteudo == null || conteudo.isBlank()) {
      return "<h3>Atualizacoes recentes</h3><ul data-manual-atualizacoes>" + item + "</ul>";
    }
    if (conteudo.contains("data-manual-atualizacoes")) {
      return conteudo.replaceFirst(
          "(<ul[^>]*data-manual-atualizacoes[^>]*>)", "$1" + item);
    }
    return conteudo + "<h3>Atualizacoes recentes</h3><ul data-manual-atualizacoes>" + item + "</ul>";
  }

  private String slugify(String texto) {
    String normalizado =
        Normalizer.normalize(texto, Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
            .toLowerCase(Locale.ROOT);
    return normalizado.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
  }

  private String textoSeguro(String valor) {
    return valor == null ? null : valor.trim();
  }

  private String escaparHtml(String valor) {
    if (valor == null) {
      return "";
    }
    return valor
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;");
  }

  private String formatarData(LocalDateTime data) {
    if (data == null) return "";
    return data.format(FORMATADOR_DATA);
  }

  private ManualSistemaSecaoResumoResponse toResumo(ManualSistemaSecao secao) {
    return new ManualSistemaSecaoResumoResponse(
        secao.getSlug(), secao.getTitulo(), secao.getOrdem(), secao.getTags(), secao.getAtualizadoEm());
  }

  private ManualSistemaSecaoResponse toSecao(ManualSistemaSecao secao) {
    ManualSistemaSecaoResponse response = new ManualSistemaSecaoResponse();
    response.setSlug(secao.getSlug());
    response.setTitulo(secao.getTitulo());
    response.setConteudo(secao.getConteudo());
    response.setOrdem(secao.getOrdem());
    response.setTags(secao.getTags());
    response.setAtualizadoEm(secao.getAtualizadoEm());
    response.setAtualizadoPor(secao.getAtualizadoPor());
    response.setVersao(secao.getVersao());
    return response;
  }

  private ManualSistemaMudancaResponse toMudanca(ManualSistemaMudanca mudanca) {
    ManualSistemaMudancaResponse response = new ManualSistemaMudancaResponse();
    response.setId(mudanca.getId());
    response.setDataMudanca(mudanca.getDataMudanca());
    response.setAutor(mudanca.getAutor());
    response.setModulo(mudanca.getModulo());
    response.setTela(mudanca.getTela());
    response.setTipo(mudanca.getTipo());
    response.setDescricaoCurta(mudanca.getDescricaoCurta());
    response.setDescricaoDetalhada(mudanca.getDescricaoDetalhada());
    response.setVersaoBuild(mudanca.getVersaoBuild());
    response.setLinks(mudanca.getLinks());
    return response;
  }
}
