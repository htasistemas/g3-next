package br.com.g3.relatorios.serviceimpl;

import br.com.g3.cadastrobeneficiario.dto.CadastroBeneficiarioResponse;
import br.com.g3.cadastrobeneficiario.service.CadastroBeneficiarioService;
import br.com.g3.relatorios.dto.BeneficiarioRelacaoRequest;
import br.com.g3.relatorios.service.RelatorioBeneficiariosService;
import br.com.g3.relatorios.util.HtmlPdfRenderer;
import br.com.g3.relatorios.util.RelatorioTemplatePadrao;
import br.com.g3.unidadeassistencial.dto.UnidadeAssistencialResponse;
import br.com.g3.unidadeassistencial.service.UnidadeAssistencialService;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RelatorioBeneficiariosServiceImpl implements RelatorioBeneficiariosService {
  private static final DateTimeFormatter DATA_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
  private final CadastroBeneficiarioService cadastroBeneficiarioService;
  private final UnidadeAssistencialService unidadeService;

  public RelatorioBeneficiariosServiceImpl(
      CadastroBeneficiarioService cadastroBeneficiarioService,
      UnidadeAssistencialService unidadeService) {
    this.cadastroBeneficiarioService = cadastroBeneficiarioService;
    this.unidadeService = unidadeService;
  }

  @Override
  public byte[] gerarPdf(BeneficiarioRelacaoRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtros do relatorio nao informados.");
    }

    String nome = limpar(request.getNome());
    String status = limpar(request.getStatus());
    List<CadastroBeneficiarioResponse> beneficiarios =
        cadastroBeneficiarioService.listar(nome, status, null, null, null, null);

    beneficiarios = aplicarFiltrosExtras(beneficiarios, request);
    beneficiarios = ordenar(beneficiarios, request.getOrdenarPor(), request.getOrdem());

    UnidadeAssistencialResponse unidade = unidadeService.obterAtual();
    String corpoHtml = montarCorpo(beneficiarios);
    String html =
        RelatorioTemplatePadrao.buildHtml(
            "Relacao de Beneficiarios",
            corpoHtml,
            unidade,
            textoSeguro(request.getUsuarioEmissor()),
            LocalDateTime.now());

    return HtmlPdfRenderer.render(html);
  }

  private List<CadastroBeneficiarioResponse> aplicarFiltrosExtras(
      List<CadastroBeneficiarioResponse> beneficiarios, BeneficiarioRelacaoRequest request) {
    String cpf = limparDigitos(request.getCpf());
    String codigo = limpar(request.getCodigo());
    LocalDate dataNascimento = parseData(request.getDataNascimento());

    return beneficiarios.stream()
        .filter((beneficiario) -> filtrarPorCpf(beneficiario, cpf))
        .filter((beneficiario) -> filtrarPorCodigo(beneficiario, codigo))
        .filter((beneficiario) -> filtrarPorDataNascimento(beneficiario, dataNascimento))
        .collect(Collectors.toList());
  }

  private List<CadastroBeneficiarioResponse> ordenar(
      List<CadastroBeneficiarioResponse> beneficiarios, String ordenarPor, String ordem) {
    if (beneficiarios == null || beneficiarios.isEmpty()) {
      return beneficiarios;
    }

    Comparator<CadastroBeneficiarioResponse> comparator;
    String ordenarPorNormalizado = limpar(ordenarPor);
    if ("data_nascimento".equalsIgnoreCase(ordenarPorNormalizado)) {
      comparator = Comparator.comparing(CadastroBeneficiarioResponse::getDataNascimento, this::nullSafeDate);
    } else if ("idade".equalsIgnoreCase(ordenarPorNormalizado)) {
      comparator =
          Comparator.comparing(
              (CadastroBeneficiarioResponse beneficiario) -> calcularIdade(beneficiario.getDataNascimento()),
              Comparator.nullsLast(Comparator.naturalOrder()));
    } else if ("bairro".equalsIgnoreCase(ordenarPorNormalizado)) {
      comparator = Comparator.comparing(
          (CadastroBeneficiarioResponse beneficiario) -> normalizarTexto(beneficiario.getBairro()));
    } else if ("codigo".equalsIgnoreCase(ordenarPorNormalizado)) {
      comparator = Comparator.comparing(CadastroBeneficiarioResponse::getCodigo, this::nullSafeString);
    } else {
      comparator =
          Comparator.comparing(
              (CadastroBeneficiarioResponse beneficiario) ->
                  normalizarTexto(textoSeguro(beneficiario.getNomeCompleto(), beneficiario.getNomeSocial())));
    }

    if ("desc".equalsIgnoreCase(limpar(ordem))) {
      comparator = comparator.reversed();
    }

    return beneficiarios.stream().sorted(comparator).collect(Collectors.toList());
  }

  private String montarCorpo(List<CadastroBeneficiarioResponse> beneficiarios) {
    StringBuilder sb = new StringBuilder();
    sb.append("<section>");
    sb.append("<table class=\"print-table\">");
    sb.append("<thead>");
    sb.append("<tr>");
    sb.append("<th>Codigo</th>");
    sb.append("<th>Nome</th>");
    sb.append("<th>CPF</th>");
    sb.append("<th>Nascimento</th>");
    sb.append("<th>Status</th>");
    sb.append("</tr>");
    sb.append("</thead>");
    sb.append("<tbody>");
    for (CadastroBeneficiarioResponse beneficiario : beneficiarios) {
      sb.append("<tr>");
      sb.append("<td>").append(escape(valorOuNaoInformado(beneficiario.getCodigo()))).append("</td>");
      sb.append("<td>")
          .append(escape(textoSeguro(beneficiario.getNomeCompleto(), beneficiario.getNomeSocial())))
          .append("</td>");
      sb.append("<td>").append(escape(valorOuNaoInformado(beneficiario.getCpf()))).append("</td>");
      sb.append("<td>").append(escape(formatarData(beneficiario.getDataNascimento()))).append("</td>");
      sb.append("<td>").append(escape(valorOuNaoInformado(beneficiario.getStatus()))).append("</td>");
      sb.append("</tr>");
    }
    if (beneficiarios.isEmpty()) {
      sb.append("<tr><td colspan=\"5\">Nenhum beneficiario encontrado.</td></tr>");
    }
    sb.append("</tbody>");
    sb.append("</table>");
    sb.append("</section>");
    return sb.toString();
  }

  private boolean filtrarPorCpf(CadastroBeneficiarioResponse beneficiario, String cpf) {
    if (cpf == null || cpf.isEmpty()) {
      return true;
    }
    return limparDigitos(beneficiario.getCpf()).contains(cpf);
  }

  private boolean filtrarPorCodigo(CadastroBeneficiarioResponse beneficiario, String codigo) {
    if (codigo == null || codigo.isEmpty()) {
      return true;
    }
    return normalizarTexto(beneficiario.getCodigo()).contains(normalizarTexto(codigo));
  }

  private boolean filtrarPorDataNascimento(
      CadastroBeneficiarioResponse beneficiario, LocalDate dataNascimento) {
    if (dataNascimento == null) {
      return true;
    }
    return Objects.equals(beneficiario.getDataNascimento(), dataNascimento);
  }

  private LocalDate parseData(String valor) {
    if (valor == null || valor.trim().isEmpty()) {
      return null;
    }
    try {
      return LocalDate.parse(valor);
    } catch (Exception ex) {
      return null;
    }
  }

  private Integer calcularIdade(LocalDate data) {
    if (data == null) {
      return null;
    }
    LocalDate hoje = LocalDate.now();
    int idade = hoje.getYear() - data.getYear();
    if (hoje.getMonthValue() < data.getMonthValue()
        || (hoje.getMonthValue() == data.getMonthValue() && hoje.getDayOfMonth() < data.getDayOfMonth())) {
      idade--;
    }
    return idade;
  }

  private int nullSafeDate(LocalDate a, LocalDate b) {
    if (a == null && b == null) {
      return 0;
    }
    if (a == null) {
      return 1;
    }
    if (b == null) {
      return -1;
    }
    return a.compareTo(b);
  }

  private int nullSafeString(String a, String b) {
    if (a == null && b == null) {
      return 0;
    }
    if (a == null) {
      return 1;
    }
    if (b == null) {
      return -1;
    }
    return a.compareToIgnoreCase(b);
  }

  private String formatarData(LocalDate data) {
    if (data == null) {
      return "Nao informado";
    }
    return DATA_FORMATTER.format(data);
  }

  private String valorOuNaoInformado(String valor) {
    if (valor == null || valor.trim().isEmpty()) {
      return "Nao informado";
    }
    return valor.trim();
  }

  private String limpar(String valor) {
    return valor == null ? null : valor.trim();
  }

  private String textoSeguro(String... valores) {
    for (String valor : valores) {
      if (valor != null && !valor.trim().isEmpty()) {
        return valor.trim();
      }
    }
    return "Nao informado";
  }

  private String limparDigitos(String valor) {
    if (valor == null) {
      return "";
    }
    return valor.replaceAll("\\D", "");
  }

  private String normalizarTexto(String valor) {
    if (valor == null) {
      return "";
    }
    String semAcento = Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    return semAcento.toLowerCase(Locale.ROOT).trim();
  }

  private String escape(String valor) {
    if (valor == null) {
      return "";
    }
    return valor.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }
}
