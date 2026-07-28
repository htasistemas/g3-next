import assert from "node:assert/strict";
import test from "node:test";
import { transparenciaInputSchema } from "../transparencias.schema.js";

const base = {
  instrumento: "Termo de fomento 12/2026",
  objeto: "Execução de oficina social",
  periodoInicio: "2026-01-01",
  periodoFim: "2026-03-31",
  tipoPrestacao: "PARCIAL" as const,
  totalRecebido: 1000,
  totalAplicado: 800,
  saldoDisponivel: 200,
  recebimentos: [],
  destinacoes: [{ titulo: "Oficinas", percentual: 100 }],
  comprovantes: [{ titulo: "Extrato", arquivoNome: "extrato.pdf" }],
  timelines: [],
  checklist: [{ titulo: "Conferir documentos", status: "concluido" }]
};

test("aceita prestação identificada e financeiramente coerente", () => {
  assert.equal(transparenciaInputSchema.parse(base).tipoPrestacao, "PARCIAL");
});

test("rejeita período invertido", () => {
  assert.throws(() => transparenciaInputSchema.parse({ ...base, periodoFim: "2025-12-31" }));
});

test("rejeita valores negativos e aplicação acima de 100%", () => {
  assert.throws(() => transparenciaInputSchema.parse({ ...base, totalAplicado: -1 }));
  assert.throws(() => transparenciaInputSchema.parse({ ...base, destinacoes: [{ titulo: "A", percentual: 101 }] }));
});

test("aceita despesas detalhadas e rejeita valor negativo", () => {
  const resultado = transparenciaInputSchema.parse({
    ...base,
    despesas: [{ descricao: "Compra de materiais", fornecedor: "Fornecedor A", valor: 800, dataPagamento: "2026-02-15" }]
  });
  assert.equal(resultado.despesas[0]?.valor, 800);
  assert.throws(() => transparenciaInputSchema.parse({ ...base, despesas: [{ descricao: "Compra", valor: -1 }] }));
});

test("aceita parecer técnico com conclusão formal", () => {
  const resultado = transparenciaInputSchema.parse({
    ...base,
    parecerConclusao: "APROVAR_RESSALVAS",
    parecerTexto: "Execução compatível com o objeto pactuado.",
    parecerRessalvas: "Apresentar documentos complementares.",
    parecerResponsavel: "Analista responsável",
    parecerData: "2026-03-31"
  });
  assert.equal(resultado.parecerConclusao, "APROVAR_RESSALVAS");
});
