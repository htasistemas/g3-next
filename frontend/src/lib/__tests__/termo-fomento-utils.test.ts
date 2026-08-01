import { describe, expect, it } from "vitest";
import { gerarHtmlTermoFomento } from "../../features/termos-fomento/termo-fomento-report";
import {
  clonarTermoFomento,
  formatarDataTermo,
  validarTermoFomento,
  validarTermoFomentoParaImpressao
} from "../../features/termos-fomento/termo-fomento-utils";
import type { TermoFomentoPayload } from "../../types/termo-fomento";

function montarTermoCompleto(): TermoFomentoPayload {
  return {
    id: "termo-1",
    numeroTermo: "TF-2026-001",
    tipoTermo: "Municipio",
    situacao: "Ativo",
    orgaoConcedente: "Prefeitura Municipal de Uberlândia",
    dataAssinatura: "2026-05-01",
    dataInicioVigencia: "2026-05-01",
    dataFimVigencia: "2026-12-31",
    descricaoObjeto: "Formalizar parceria para execução de ações socioassistenciais.",
    valorGlobal: 250000,
    responsavelInterno: "Maria Oliveira",
    termoDocumento: {
      nome: "Termo principal",
      tipo: "termo",
      dataUrl: "https://exemplo.org/termo-principal.pdf"
    },
    documentosRelacionados: [
      {
        nome: "Plano de trabalho",
        tipo: "termo",
        dataUrl: "https://exemplo.org/plano-trabalho.pdf"
      }
    ],
    aditivos: [
      {
        tipoAditivo: "Prorrogação",
        dataAditivo: "2026-08-01",
        novaDataFim: "2027-01-31",
        novoValor: 50000,
        observacoes: "Prorrogação por interesse público."
      }
    ]
  };
}

describe("termo-fomento-utils", () => {
  it("valida um termo completo para salvar e imprimir", () => {
    const termo = montarTermoCompleto();
    expect(validarTermoFomento(termo, "rascunho")).toEqual({});
    expect(validarTermoFomentoParaImpressao(termo)).toEqual({});
  });

  it("faz clone profundo do termo", () => {
    const original = montarTermoCompleto();
    const clone = clonarTermoFomento(original);

    clone.numeroTermo = "TF-2026-002";
    const documentosRelacionados = clone.documentosRelacionados ?? [];
    documentosRelacionados[0]!.nome = "Alterado";

    expect(original.numeroTermo).toBe("TF-2026-001");
    expect(original.documentosRelacionados?.[0]?.nome).toBe("Plano de trabalho");
  });

  it("gera html de impressão com os dados principais e aditivos", () => {
    const termo = montarTermoCompleto();
    const html = gerarHtmlTermoFomento(termo);

    expect(html).toContain("Termo de fomento");
    expect(html).toContain("TF-2026-001");
    expect(html).toContain("Prefeitura Municipal de Uberlândia");
    expect(html).toContain("Documento principal");
    expect(html).toContain("Aditivos");
    expect(html).toContain("Prorrogação");
  });

  it("formata datas no padrão pt-BR", () => {
    expect(formatarDataTermo("2026-05-01")).toBe("01/05/2026");
  });
});
