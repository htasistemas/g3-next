package br.com.g3.relatorios.serviceimpl;

import br.com.g3.relatorios.dto.TermoAutorizacaoRequest;
import br.com.g3.relatorios.service.TermoAutorizacaoService;
import br.com.g3.relatorios.util.HtmlPdfRenderer;
import br.com.g3.relatorios.util.RelatorioTemplatePadrao;
import br.com.g3.unidadeassistencial.dto.UnidadeAssistencialResponse;
import br.com.g3.unidadeassistencial.service.UnidadeAssistencialService;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class TermoAutorizacaoServiceImpl implements TermoAutorizacaoService {
  private final UnidadeAssistencialService unidadeService;

  public TermoAutorizacaoServiceImpl(UnidadeAssistencialService unidadeService) {
    this.unidadeService = unidadeService;
  }

  @Override
  public byte[] gerarPdf(TermoAutorizacaoRequest request) {
    UnidadeAssistencialResponse unidade = unidadeService.obterAtual();
    String corpoHtml = montarCorpoHtml(request, unidade);
    String html =
        RelatorioTemplatePadrao.buildHtml(
            "Termo de Consentimento para Uso de Dados Pessoais e Imagem",
            corpoHtml,
            unidade,
            textoSeguro(request.getIssuedBy()),
            LocalDateTime.now(),
            unidade != null ? unidade.getRazaoSocial() : null);
    return HtmlPdfRenderer.render(html);
  }

  private String montarCorpoHtml(TermoAutorizacaoRequest request, UnidadeAssistencialResponse unidade) {
    String beneficiario = textoSeguro(request.getBeneficiarioNome());
    String rg = textoSeguro(request.getRg());
    String cpf = textoSeguro(request.getCpf());
    String endereco = textoSeguro(request.getEnderecoCompleto());
    String cidade = textoSeguro(request.getCidade());
    String uf = textoSeguro(request.getUf());
    String finalidadeDados =
        textoSeguroComPadrao(
            request.getFinalidadeDados(),
            "cadastro, analise de elegibilidade para programas sociais, acompanhamento familiar e emissao de relatorios a orgaos publicos.");
    String finalidadeImagem =
        textoSeguroComPadrao(
            request.getFinalidadeImagem(),
            "divulgacao institucional, prestacao de contas a parceiros, campanhas de conscientizacao e publicacoes em canais oficiais.");
    String vigencia = textoSeguroComPadrao(request.getVigencia(), "prazo indeterminado");
    String localAssinatura =
        textoSeguroComPadrao(request.getLocalAssinatura(), montarLocal(cidade, uf));
    String dataAssinatura = textoSeguroComPadrao(request.getDataAssinatura(), "data nao informada");
    String responsavelNome = textoSeguro(request.getResponsavelNome());
    String responsavelCpf = textoSeguro(request.getResponsavelCpf());
    String responsavelRelacao = textoSeguro(request.getResponsavelRelacao());
    String representanteNome =
        textoSeguroComPadrao(request.getRepresentanteNome(), textoSeguro(request.getIssuedBy()));
    String representanteCargo = textoSeguro(request.getRepresentanteCargo());

    String instituicaoNome =
        unidade != null && unidade.getNomeFantasia() != null && !unidade.getNomeFantasia().trim().isEmpty()
            ? unidade.getNomeFantasia().trim()
            : "Instituicao nao informada";
    String instituicaoCnpj = unidade != null ? textoSeguro(unidade.getCnpj()) : "Nao informado";

    StringBuilder sb = new StringBuilder();
    sb.append("<style>");
    sb.append(
        "@page{size:A4;margin-top:58mm !important;margin-right:20mm !important;margin-bottom:20mm !important;margin-left:20mm !important;}");
    sb.append(".header{padding-bottom:6px !important;margin-bottom:12px !important;}");
    sb.append(".header__title{font-size:18px !important;line-height:1.15 !important;}");
    sb.append(".content{margin-top:10mm !important;padding:0 !important;}");
    sb.append("</style>");
    sb.append("<div style=\"font-size: 12px;\">");
    sb.append("<p>Pelo presente instrumento, eu, <strong>")
        .append(escapeHtml(beneficiario))
        .append("</strong>, portador(a) do documento de identidade RG n&#186; ")
        .append(escapeHtml(rg))
        .append(" e CPF n&#186; ")
        .append(escapeHtml(cpf))
        .append(", residente e domiciliado(a) na Rua ")
        .append(escapeHtml(endereco))
        .append(", na cidade de ")
        .append(escapeHtml(cidade))
        .append("-")
        .append(escapeHtml(uf))
        .append(" (ou o responsavel legal, se aplicavel), doravante denominado(a) TITULAR, declaro que consinto, de forma livre, informada e inequivoca, com o tratamento dos meus dados pessoais e com o uso da minha imagem pela instituicao ")
        .append(escapeHtml(instituicaoNome))
        .append(", inscrita no CNPJ sob o n&#186; ")
        .append(escapeHtml(instituicaoCnpj))
        .append(", doravante denominada CONTROLADOR(A).</p>");

    sb.append("<ol>");
    sb.append("<li><strong>DA FINALIDADE DO TRATAMENTO E USO</strong><br/>");
    sb.append("Tratamento de Dados Pessoais: Coleta, armazenamento e processamento de dados (como nome, CPF, endereco, renda, composicao familiar e informacoes de saude, se pertinentes) para fins de ")
        .append(escapeHtml(finalidadeDados))
        .append(".<br/>");
    sb.append("Uso de Imagem: Utilizacao de minha imagem, voz e/ou depoimento (em fotos, videos, audios) para fins de ")
        .append(escapeHtml(finalidadeImagem))
        .append(".</li>");

    sb.append("<li><strong>DA FORMA DE DIVULGACAO (PARA USO DE IMAGEM)</strong><br/>");
    sb.append("A autorizacao para uso de imagem abrange a divulgacao em todo territorio nacional e, se necessario, no exterior, por meio de midias impressas (cartazes, folders, relatorios) e digitais (website, e-mail marketing, redes sociais como Facebook, Instagram, YouTube), sem finalidade comercial.</li>");

    sb.append("<li><strong>DA GRATUIDADE E VIGENCIA</strong><br/>");
    sb.append("A presente autorizacao e concedida a titulo gratuito (sem qualquer remuneracao) e por ")
        .append(escapeHtml(vigencia))
        .append(".</li>");

    sb.append("<li><strong>DOS DIREITOS DO TITULAR</strong><br/>");
    sb.append("Estou ciente de que a Lei n&#186; 13.709/2018 (LGPD) me garante direitos como acesso aos dados, correcao, anonimizacao, bloqueio ou eliminacao de dados desnecessarios ou excessivos. A qualquer momento, posso revogar este consentimento, mediante manifestacao expressa, por escrito, junto a instituicao.</li>");

    sb.append("<li><strong>DA SEGURANCA E RESPONSABILIDADES</strong><br/>");
    sb.append("O(A) CONTROLADOR(A) se compromete a adotar medidas de seguranca, tecnicas e administrativas, aptas a proteger os dados pessoais e a imagem de acessos nao autorizados e de situacoes acidentais ou ilicitas de destruicao, perda, alteracao, comunicacao ou difusao.</li>");
    sb.append("</ol>");

    sb.append("<p>Por estar de acordo com os termos e condicoes acima, firmo o presente documento.</p>");
    sb.append("<p style=\"margin-bottom: 1cm;\">")
        .append(escapeHtml(localAssinatura))
        .append(", ")
        .append(escapeHtml(dataAssinatura))
        .append(".</p>");

    sb.append("<div class=\"signature\" style=\"margin-top: 12px;\">");
    sb.append("  <div class=\"signature__line\" style=\"border-top: none; border-bottom: 1px solid #111827; min-height: 90px; display: flex; align-items: flex-end; padding-bottom: 6px;\">");
    sb.append("Assinatura do(a) Beneficiario(a) / Titular dos Dados</div>");
    sb.append("  <div class=\"signature__line\" style=\"border-top: none; border-bottom: 1px solid #111827; min-height: 90px; display: flex; align-items: flex-end; padding-bottom: 6px;\">");
    sb.append("Assinatura do(a) Representante da Instituicao</div>");
    sb.append("</div>");
    sb.append("</div>");

    return sb.toString();
  }

  private String montarLocal(String cidade, String uf) {
    String cidadeOk = textoSeguro(cidade);
    String ufOk = textoSeguro(uf);
    if ("Nao informado".equals(cidadeOk) && "Nao informado".equals(ufOk)) {
      return "Local";
    }
    if ("Nao informado".equals(cidadeOk)) {
      return ufOk;
    }
    if ("Nao informado".equals(ufOk)) {
      return cidadeOk;
    }
    return cidadeOk + "-" + ufOk;
  }

  private String textoSeguro(String valor) {
    if (valor == null) {
      return "Nao informado";
    }
    String limpo = valor.trim();
    if (limpo.isEmpty()) {
      return "Nao informado";
    }
    return limpo;
  }

  private String textoSeguroComPadrao(String valor, String padrao) {
    String limpo = textoSeguro(valor);
    return "Nao informado".equals(limpo) ? padrao : limpo;
  }

  private String escapeHtml(String valor) {
    if (valor == null) {
      return "";
    }
    return valor.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }
}
