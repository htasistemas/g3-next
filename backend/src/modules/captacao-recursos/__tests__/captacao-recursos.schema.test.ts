import assert from "node:assert/strict";
import test from "node:test";
import {
  captacaoCampanhaInputSchema,
  captacaoDoadorInputSchema,
  captacaoPortalLoginSchema,
  captacaoTarefaRelacionamentoInputSchema
} from "../captacao-recursos.schema.js";

test("captacaoDoadorInputSchema aceita doador anonimo sem documento", () => {
  const resultado = captacaoDoadorInputSchema.parse({
    tipoDoador: "anonimo",
    nome: "Doador anônimo",
    status: "ativo"
  });

  assert.equal(resultado.tipoDoador, "anonimo");
  assert.equal(resultado.nome, "Doador anônimo");
  assert.equal(resultado.cpfCnpj, undefined);
});

test("captacaoDoadorInputSchema rejeita CPF invalido para pessoa fisica", () => {
  assert.throws(() =>
    captacaoDoadorInputSchema.parse({
      tipoDoador: "pessoa_fisica",
      nome: "Maria doadora",
      cpfCnpj: "111.111.111-11",
      status: "ativo"
    })
  );
});

test("captacaoCampanhaInputSchema normaliza data em dd-mm-aaaa e valida cor hexadecimal", () => {
  const resultado = captacaoCampanhaInputSchema.parse({
    nome: "Campanha inverno solidário",
    tipo: "sazonal",
    status: "ativa",
    dataInicial: "18-03-2026",
    corDestaque: "#0F766E"
  });

  assert.equal(resultado.dataInicial, "2026-03-18");
  assert.equal(resultado.corDestaque, "#0F766E");
});

test("captacaoPortalLoginSchema normaliza e-mail informado pelo doador", () => {
  const resultado = captacaoPortalLoginSchema.parse({
    email: "  DOADOR@EXEMPLO.ORG ",
    documento: "12345678900"
  });

  assert.equal(resultado.email, "doador@exemplo.org");
});

test("captacaoDoadorInputSchema aceita campos de retencao e segmentacao", () => {
  const resultado = captacaoDoadorInputSchema.parse({
    tipoDoador: "pessoa_fisica",
    nome: "Carlos doador",
    status: "ativo",
    segmentoRelacionamento: "Base recorrente",
    statusRetencao: "em_recuperacao",
    motivoRisco: "Ultima doacao acima de 120 dias",
    proximaAcaoSugerida: "Ligar e oferecer retomada mensal",
    scoreRelacionamento: "78"
  });

  assert.equal(resultado.segmentoRelacionamento, "Base recorrente");
  assert.equal(resultado.statusRetencao, "em_recuperacao");
  assert.equal(resultado.scoreRelacionamento, 78);
});

test("captacaoTarefaRelacionamentoInputSchema exige titulo minimo e normaliza data", () => {
  const resultado = captacaoTarefaRelacionamentoInputSchema.parse({
    titulo: "Ligar para reter doador",
    dataPrevista: "21-05-2026"
  });

  assert.equal(resultado.titulo, "Ligar para reter doador");
  assert.equal(resultado.dataPrevista, "2026-05-21");
  assert.equal(resultado.status, "pendente");
});
