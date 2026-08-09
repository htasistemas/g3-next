import { describe, expect, it } from "vitest";
import { gerarHtmlRelatorioPrestacaoContas } from "../../features/prestacao-contas/prestacao-contas-report";
import type { PrestacaoContasPayload } from "../../types/prestacao-contas";

function montarPrestacao(): PrestacaoContasPayload {
  return {
    id: "PC-001",
    instrumento: "TF-DEMO-2026-001",
    tipoPrestacao: "FINAL",
    statusWorkflow: "APROVADA_RESSALVAS",
    periodoInicio: "2026-01-01",
    periodoFim: "2026-12-31",
    objeto: "Execução de oficinas socioeducativas <script>",
    totalRecebido: 10000,
    totalAplicado: 8500,
    saldoDisponivel: 1500,
    prestadoMes: 2400,
    parecerConclusao: "APROVAR_RESSALVAS",
    parecerResponsavel: "Responsável demonstrativo",
    parecerData: "2026-12-20",
    parecerTexto: "Documentação conferida com ressalvas administrativas.",
    recebimentos: [
      {
        fonte: "Fundo municipal",
        valor: 10000,
        periodicidade: "Parcela única",
        status: "Recebido"
      }
    ],
    destinacoes: [
      {
        titulo: "Material pedagógico",
        descricao: "Compra de materiais para oficinas",
        percentual: 45
      }
    ],
    comprovantes: [
      {
        titulo: "Nota fiscal 001",
        descricao: "Comprovante de compra",
        arquivoNome: "nota-fiscal-001.pdf"
      }
    ],
    timelines: [
      {
        titulo: "Envio para análise",
        detalhe: "Processo enviado para análise técnica.",
        status: "concluido"
      }
    ],
    checklist: [
      {
        titulo: "Conferência documental",
        descricao: "Documentos obrigatórios anexados",
        status: "concluido"
      }
    ],
    despesas: [
      {
        descricao: "Materiais de consumo",
        fornecedor: "Fornecedor fictício",
        documentoFiscal: "NF-001",
        dataPagamento: "2026-06-10",
        categoria: "Material",
        status: "Pago",
        valor: 8500
      }
    ],
    parecerHistorico: [
      {
        id: "1",
        versao: 1,
        conclusao: "APROVAR_RESSALVAS",
        parecerTexto: "Primeira versão do parecer.",
        ressalvas: "Ajustar anexo complementar.",
        responsavel: "Responsável demonstrativo",
        dataParecer: "2026-12-20",
        criadoEm: "2026-12-20T10:00:00.000Z"
      }
    ]
  };
}

describe("gerarHtmlRelatorioPrestacaoContas", () => {
  it("gera um relatório completo com as principais seções da prestação de contas", () => {
    const html = gerarHtmlRelatorioPrestacaoContas({
      registros: [montarPrestacao()],
      dataGeracao: new Date("2026-12-21T09:30:00"),
      geradoPor: "Usuário demonstrativo",
      filtros: { busca: "TF-DEMO", situacao: "todos", apenasPendencias: false },
      resumoPorRegistro: () => ({
        status: "concluido",
        totalRecebimentos: 10000,
        totalDestinacoesPercentual: 45,
        totalChecklistConcluido: 1,
        totalChecklistPendente: 0,
        totalComprovantes: 1,
        totalDespesas: 8500,
        diferencaConciliacao: 0,
        percentualChecklist: 100,
        saldoCalculado: 1500,
        pendencias: []
      })
    });

    expect(html).toContain("Relatório de prestação de contas");
    expect(html).toContain("Resumo executivo");
    expect(html).toContain("Registros contemplados");
    expect(html).toContain("TF-DEMO-2026-001");
    expect(html).toContain("Recebimentos");
    expect(html).toContain("Aplicação dos recursos");
    expect(html).toContain("Despesas e pagamentos");
    expect(html).toContain("Comprovantes e documentos");
    expect(html).toContain("Checklist de conferência");
    expect(html).toContain("Parecer técnico");
    expect(html).toContain("Assinaturas");
  });

  it("escapa conteúdo livre informado pelo usuário", () => {
    const html = gerarHtmlRelatorioPrestacaoContas({
      registros: [montarPrestacao()],
      resumoPorRegistro: () => ({
        status: "pendente",
        totalRecebimentos: 10000,
        totalDestinacoesPercentual: 45,
        totalChecklistConcluido: 0,
        totalChecklistPendente: 1,
        totalComprovantes: 1,
        totalDespesas: 8500,
        diferencaConciliacao: 0,
        percentualChecklist: 0,
        saldoCalculado: 1500,
        pendencias: ["Ainda existem itens pendentes no checklist."]
      })
    });

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("Execução de oficinas socioeducativas <script>");
  });
});
