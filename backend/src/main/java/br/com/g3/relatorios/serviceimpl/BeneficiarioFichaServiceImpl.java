package br.com.g3.relatorios.serviceimpl;

import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.service.CadastroBeneficiarioService;
import br.com.g3.relatorios.dto.BeneficiarioFichaRequest;
import br.com.g3.relatorios.service.BeneficiarioFichaService;
import br.com.g3.relatorios.util.HtmlPdfRenderer;
import br.com.g3.relatorios.util.RelatorioTemplatePadrao;
import br.com.g3.unidadeassistencial.dto.UnidadeAssistencialResponse;
import br.com.g3.unidadeassistencial.service.UnidadeAssistencialService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BeneficiarioFichaServiceImpl implements BeneficiarioFichaService {
  private static final DateTimeFormatter DATA_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private final CadastroBeneficiarioService cadastroBeneficiarioService;
  private final UnidadeAssistencialService unidadeService;

  public BeneficiarioFichaServiceImpl(
      CadastroBeneficiarioService cadastroBeneficiarioService,
      UnidadeAssistencialService unidadeService) {
    this.cadastroBeneficiarioService = cadastroBeneficiarioService;
    this.unidadeService = unidadeService;
  }

  @Override
  public byte[] gerarPdf(BeneficiarioFichaRequest request) {
    if (request == null || request.getBeneficiarioId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Beneficiario nao informado.");
    }

    CadastroBeneficiarioResponse beneficiario =
        cadastroBeneficiarioService.buscarPorId(request.getBeneficiarioId());

    UnidadeAssistencialResponse unidade = unidadeService.obterAtual();
    String corpoHtml = montarCorpo(beneficiario, unidade);
    String html =
        RelatorioTemplatePadrao.buildHtml(
            "FICHA CADASTRAL DE BENEFICIARIO",
            corpoHtml,
            unidade,
            textoSeguro(request.getUsuarioEmissor()),
            LocalDateTime.now());

    return HtmlPdfRenderer.render(html);
  }

  private String montarCorpo(CadastroBeneficiarioResponse b, UnidadeAssistencialResponse unidade) {
    StringBuilder sb = new StringBuilder();
    sb.append("<style>");
    sb.append(
        "@page{size:A4;margin-top:58mm !important;margin-right:20mm !important;margin-bottom:20mm !important;margin-left:20mm !important;}");
    sb.append(".header{padding-bottom:6px !important;margin-bottom:12px !important;}");
    sb.append(".header__title{font-size:20px !important;line-height:1.1 !important;}");
    sb.append(".content{margin-top:10mm !important;padding:0 !important;}");
    sb.append("</style>");
    sb.append("<div class=\"ficha-cadastro-root\">");
    sb.append("<section class=\"ficha-info\">");
    sb.append("<table class=\"info-line\"><tr>");
    sb.append("<td>")
        .append("<span class=\"info-label\">Data do Cadastro:</span> ")
        .append("<span class=\"info-value\">")
        .append(escape(valorSeguro(formatarDataHoraOpcional(b.getDataCadastro()))))
        .append("</span>")
        .append("</td>");
    sb.append("<td>")
        .append("<span class=\"info-label\">Cartao Beneficio:</span> ")
        .append("<span class=\"info-value info-value--highlight\">")
        .append(escape(valorSeguro(b.getCodigo())))
        .append("</span>")
        .append("</td>");
    sb.append("<td>")
        .append("<span class=\"info-label\">Atualizado em:</span> ")
        .append("<span class=\"info-value\">")
        .append(escape(valorSeguro(formatarDataHoraOpcional(b.getDataAtualizacao()))))
        .append("</span>")
        .append("</td>");
    sb.append("</tr></table>");
    sb.append("</section>");

    sb.append("<section class=\"hero\">");
    sb.append("<table class=\"hero-table\">");
    sb.append("<tr>");
    sb.append("<td class=\"hero-table__photo\">");
    if (isPreenchido(b.getFoto3x4())) {
      sb.append("<img src=\"").append(escape(b.getFoto3x4())).append("\" alt=\"Foto 3x4\" />");
    }
    sb.append("</td>");
    sb.append("<td class=\"hero-table__info\">");
    sb.append("<table class=\"hero-table__header\"><tr>");
    sb.append("<td class=\"hero-table__name\">");
    if (isPreenchido(b.getNomeCompleto())) {
      sb.append("<p class=\"hero__name\">").append(escape(b.getNomeCompleto())).append("</p>");
    }
    sb.append("</td>");
    sb.append("<td class=\"hero-table__status\">");
    if (isPreenchido(b.getStatus())) {
      sb.append("<span class=\"status-badge ")
          .append(statusClasse(b.getStatus()))
          .append("\">")
          .append(escape(b.getStatus()))
          .append("</span>");
    }
    Integer idade = calcularIdade(b.getDataNascimento());
    if (idade != null) {
      sb.append("<p class=\"hero__age\">Idade: ")
          .append(idade)
          .append("</p>");
    }
    sb.append("</td>");
    sb.append("</tr></table>");
    appendResumoSePreenchido(sb, "CPF", b.getCpf());
    appendResumoSePreenchido(sb, "Codigo", b.getCodigo());
    appendResumoSePreenchido(sb, "Nascimento", formatarDataOpcional(b.getDataNascimento()));
    sb.append("</td>");
    sb.append("</tr>");
    sb.append("</table>");
    sb.append("</section>");

    String cardIdentificacao = montarCardIdentificacao(b);
    if (!cardIdentificacao.isEmpty()) {
      sb.append(cardIdentificacao);
    }
    String cardInformacoes = montarCardInformacoesPessoais(b);
    if (!cardInformacoes.isEmpty()) {
      sb.append(cardInformacoes);
    }
    sb.append("</div>");
    return sb.toString();
  }

  private void appendResumoSePreenchido(StringBuilder sb, String rotulo, String valor) {
    if (!isPreenchido(valor)) {
      return;
    }
    sb.append("<p class=\"hero__meta\"><strong>")
        .append(escape(rotulo))
        .append(":</strong> ")
        .append(escape(valor.trim()))
        .append("</p>");
  }

  private String statusClasse(String status) {
    if (status == null) {
      return "status-badge--analise";
    }
    switch (status.trim().toUpperCase()) {
      case "ATIVO":
        return "status-badge--ativo";
      case "DESATUALIZADO":
        return "status-badge--desatualizado";
      case "INCOMPLETO":
        return "status-badge--incompleto";
      case "BLOQUEADO":
        return "status-badge--bloqueado";
      case "EM_ANALISE":
      default:
        return "status-badge--analise";
    }
  }

  private boolean isPreenchido(String valor) {
    return valor != null && !valor.trim().isEmpty() && !"Nao informado".equals(valor);
  }

  private String formatarDataOpcional(LocalDate data) {
    if (data == null) {
      return null;
    }
    return DATA_FORMATTER.format(data);
  }

  private String formatarBooleanOpcional(Boolean valor) {
    if (valor == null) {
      return null;
    }
    return valor ? "Sim" : "Nao";
  }

  private String formatarNumeroOpcional(Integer valor) {
    if (valor == null) {
      return null;
    }
    return String.valueOf(valor);
  }

  private String formatarListaOpcional(List<String> valores) {
    if (valores == null || valores.isEmpty()) {
      return null;
    }
    String resultado =
        valores.stream()
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter((item) -> !item.isEmpty())
        .collect(Collectors.joining(", "));
    return resultado.isEmpty() ? null : resultado;
  }

  private String juntarOpcional(String valor1, String valor2) {
    String v1 = textoOpcional(valor1);
    String v2 = textoOpcional(valor2);
    if (v1 == null && v2 == null) {
      return null;
    }
    if (v1 == null) {
      return v2;
    }
    if (v2 == null) {
      return v1;
    }
    return v1 + " - " + v2;
  }

  private String textoOpcional(String valor) {
    if (valor == null || valor.trim().isEmpty()) {
      return null;
    }
    return valor.trim();
  }

  private String escape(String valor) {
    if (valor == null) {
      return "";
    }
    return valor.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }

  private String textoSeguro(String valor) {
    if (valor == null || valor.trim().isEmpty()) {
      return "Sistema";
    }
    return valor.trim();
  }

  private String formatarDataHoraOpcional(LocalDateTime dataHora) {
    if (dataHora == null) {
      return null;
    }
    return DATA_FORMATTER.format(dataHora.toLocalDate());
  }

  private String formatarCpf(String cpf) {
    if (cpf == null) {
      return null;
    }
    String numeros = cpf.replaceAll("\\D", "");
    if (numeros.length() != 11) {
      return cpf.trim();
    }
    return numeros.substring(0, 3)
        + "."
        + numeros.substring(3, 6)
        + "."
        + numeros.substring(6, 9)
        + "-"
        + numeros.substring(9);
  }

  private Integer calcularIdade(LocalDate dataNascimento) {
    if (dataNascimento == null) {
      return null;
    }
    LocalDate hoje = LocalDate.now();
    if (dataNascimento.isAfter(hoje)) {
      return null;
    }
    int idade = hoje.getYear() - dataNascimento.getYear();
    if (hoje.getDayOfYear() < dataNascimento.getDayOfYear()) {
      idade -= 1;
    }
    return idade;
  }

  private String valorSeguro(String valor) {
    return valor == null ? "" : valor.trim();
  }

  private String montarCardIdentificacao(CadastroBeneficiarioResponse b) {
    StringBuilder sb = new StringBuilder();
    StringBuilder linhas = new StringBuilder();
    int total = 0;
    sb.append("<section class=\"section\">")
        .append("<div class=\"card\">")
        .append("<div class=\"card__header\">")
        .append("<p class=\"card__title\">DADOS DE IDENTIFICACAO</p>")
        .append("</div>")
        .append("<div class=\"card__body\">")
        .append("<table class=\"ficha-grid\">");

    total += appendLinhaDuplaSePreenchido(linhas, "Beneficiario", b.getNomeCompleto(), null, null, true);
    total += appendLinhaDuplaSePreenchido(
        linhas,
        "Data Nascimento",
        formatarDataOpcional(b.getDataNascimento()),
        "Mae / Resp",
        b.getNomeMae(),
        false);
    total += appendLinhaDuplaSePreenchido(linhas, "Sexo", b.getSexoBiologico(), "Endereco", b.getLogradouro(), false);
    total += appendLinhaDuplaSePreenchido(linhas, "Numero", b.getNumero(), "Bairro", b.getBairro(), false);
    total += appendLinhaDuplaSePreenchido(linhas, "Complemento", b.getComplemento(), null, null, true);
    total += appendLinhaDuplaSePreenchido(linhas, "Cidade", b.getMunicipio(), "Estado", b.getUf(), false);
    total += appendLinhaDuplaSePreenchido(
        linhas,
        "Natural de",
        juntarOpcional(b.getNaturalidadeCidade(), b.getNaturalidadeUf()),
        null,
        null,
        true);
    total += appendLinhaDuplaSePreenchido(linhas, "CEP", b.getCep(), "Telefone", b.getTelefonePrincipal(), false);

    if (total == 0) {
      return "";
    }
    sb.append(linhas);

    sb.append("</table>")
        .append("</div>")
        .append("</div>")
        .append("</section>");
    return sb.toString();
  }

  private String montarCardInformacoesPessoais(CadastroBeneficiarioResponse b) {
    StringBuilder sb = new StringBuilder();
    StringBuilder linhas = new StringBuilder();
    int total = 0;
    sb.append("<section class=\"section\">")
        .append("<div class=\"card\">")
        .append("<div class=\"card__header\">")
        .append("<p class=\"card__title\">INFORMACOES PESSOAIS</p>")
        .append("</div>")
        .append("<div class=\"card__body\">")
        .append("<table class=\"ficha-grid\">");

    total += appendLinhaDuplaSePreenchido(
        linhas,
        "CPF",
        formatarCpf(b.getCpf()),
        "Raca/Cor",
        b.getCorRaca(),
        false);
    total += appendLinhaDuplaSePreenchido(
        linhas,
        "Identidade",
        b.getRgNumero(),
        "Frequenda Escola",
        formatarBooleanOpcional(b.getEstudaAtualmente()),
        false);
    total += appendLinhaDuplaSePreenchido(
        linhas,
        "Sit. Familiar",
        b.getComposicaoFamiliar(),
        "Pais de Origem",
        b.getNacionalidade(),
        false);
    total += appendLinhaDuplaSePreenchido(linhas, "Profissao", b.getOcupacao(), "Escolaridade", b.getNivelEscolaridade(), false);
    total += appendLinhaTextareaSePreenchido(linhas, "Observacao", b.getObservacoes());

    if (total == 0) {
      return "";
    }
    sb.append(linhas);

    sb.append("</table>")
        .append("</div>")
        .append("</div>")
        .append("</section>");
    return sb.toString();
  }

  private void appendLinhaDupla(
      StringBuilder sb,
      String rotulo1,
      String valor1,
      String rotulo2,
      String valor2,
      boolean linhaInteira) {
    sb.append("<tr>");
    if (linhaInteira) {
      sb.append("<td class=\"ficha-campo\" colspan=\"2\">")
          .append("<div class=\"field__line\">")
          .append("<span class=\"field__label-inline\">")
          .append(escape(rotulo1))
          .append(":</span> ")
          .append("<span class=\"field__value-inline\">")
          .append(escape(valorSeguro(valor1)))
          .append("</span>")
          .append("</div>")
          .append("</td>")
          .append("</tr>");
      return;
    }
    sb.append("<td class=\"ficha-campo\">")
        .append("<div class=\"field__line\">")
        .append("<span class=\"field__label-inline\">")
        .append(escape(rotulo1))
        .append(":</span> ")
        .append("<span class=\"field__value-inline")
        .append("CPF".equals(rotulo1) ? " field__value-inline--cpf" : "")
        .append("\">")
        .append(escape(valorSeguro(valor1)))
        .append("</span>")
        .append("</div>")
        .append("</td>");
    sb.append("<td class=\"ficha-campo\">")
        .append("<div class=\"field__line\">")
        .append("<span class=\"field__label-inline\">")
        .append(escape(rotulo2 == null ? "" : rotulo2))
        .append(rotulo2 == null ? "" : ":")
        .append("</span> ")
        .append("<span class=\"field__value-inline")
        .append("CPF".equals(rotulo2) ? " field__value-inline--cpf" : "")
        .append("\">")
        .append(escape(valorSeguro(valor2)))
        .append("</span>")
        .append("</div>")
        .append("</td>");
    sb.append("</tr>");
  }

  private void appendLinhaTextarea(StringBuilder sb, String rotulo, String valor) {
    sb.append("<tr>");
    sb.append("<td class=\"ficha-campo\" colspan=\"2\">")
        .append("<div class=\"field__line field__line--textarea\">")
        .append("<span class=\"field__label-inline\">")
        .append(escape(rotulo))
        .append(":</span> ")
        .append("<span class=\"field__value-inline\">")
        .append(escape(valorSeguro(valor)))
        .append("</span>")
        .append("</div>")
        .append("</td>");
    sb.append("</tr>");
  }

  private int appendLinhaDuplaSePreenchido(
      StringBuilder sb,
      String rotulo1,
      String valor1,
      String rotulo2,
      String valor2,
      boolean linhaInteira) {
    String v1 = textoOpcional(valor1);
    String v2 = textoOpcional(valor2);
    if (linhaInteira) {
      if (v1 == null) {
        return 0;
      }
      appendLinhaDupla(sb, rotulo1, v1, null, null, true);
      return 1;
    }
    if (v1 == null && v2 == null) {
      return 0;
    }
    if (v1 == null) {
      appendLinhaDupla(sb, rotulo2, v2, null, null, true);
      return 1;
    }
    if (v2 == null) {
      appendLinhaDupla(sb, rotulo1, v1, null, null, true);
      return 1;
    }
    appendLinhaDupla(sb, rotulo1, v1, rotulo2, v2, false);
    return 1;
  }

  private int appendLinhaTextareaSePreenchido(StringBuilder sb, String rotulo, String valor) {
    if (!isPreenchido(valor)) {
      return 0;
    }
    appendLinhaTextarea(sb, rotulo, valor);
    return 1;
  }
}
