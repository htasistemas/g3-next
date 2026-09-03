import assert from "node:assert/strict";
import test from "node:test";
import { cipaColaboradorInputSchema, cipaEleicaoInputSchema } from "../cipa.schema.js";
import XLSX from "xlsx";
import { lerCipaImportacao } from "../cipa.import-parser.js";

const colaboradorBase = {
  matricula: "MAT-001",
  nomeCompleto: "Maria da Silva",
  cpf: "529.982.247-25",
  dataNascimento: "1990-05-12",
  dataAdmissao: "2020-01-10"
};

test("CIPA aceita CPF válido e normaliza a máscara", () => {
  const resultado = cipaColaboradorInputSchema.parse(colaboradorBase);
  assert.equal(resultado.cpf, "52998224725");
  assert.equal(resultado.status, "ATIVO");
});

test("CIPA rejeita CPF inválido", () => {
  assert.throws(() => cipaColaboradorInputSchema.parse({ ...colaboradorBase, cpf: "111.111.111-11" }));
});

test("CIPA exige pelo menos 15 dias corridos de inscrição", () => {
  assert.throws(() => cipaEleicaoInputSchema.parse({
    unidadeId: "1",
    nome: "Eleição CIPA 2026",
    gestao: "2026/2027",
    inscricoesInicio: "2026-01-01",
    inscricoesFim: "2026-01-10",
    votacaoInicio: "2026-01-11",
    votacaoFim: "2026-01-12"
  }));
});

test("CIPA aceita cronograma válido e aplica regras padrão", () => {
  const resultado = cipaEleicaoInputSchema.parse({
    unidadeId: "1",
    nome: "Eleição CIPA 2026",
    gestao: "2026/2027",
    inscricoesInicio: "2026-01-01",
    inscricoesFim: "2026-01-16",
    votacaoInicio: "2026-01-17",
    votacaoFim: "2026-01-18"
  });
  assert.equal(resultado.titulares, 1);
  assert.equal(resultado.permiteVotoBranco, true);
  assert.equal(resultado.regraDesempate, "TEMPO_SERVICO_ESTABELECIMENTO");
});

test("CIPA rejeita divulgação, apuração e posse fora da sequência", () => {
  const base = { unidadeId: "1", nome: "Eleição CIPA 2026", gestao: "2026/2027", inscricoesInicio: "2026-01-01", inscricoesFim: "2026-01-16", votacaoInicio: "2026-01-17", votacaoFim: "2026-01-18" };
  assert.throws(() => cipaEleicaoInputSchema.parse({ ...base, divulgacaoCandidatosEm: "2026-01-10" }));
  assert.throws(() => cipaEleicaoInputSchema.parse({ ...base, apuracaoEm: "2026-01-17" }));
  assert.throws(() => cipaEleicaoInputSchema.parse({ ...base, apuracaoEm: "2026-01-19", publicacaoPrevistaEm: "2026-01-18" }));
  assert.throws(() => cipaEleicaoInputSchema.parse({ ...base, publicacaoPrevistaEm: "2026-01-20", posseEm: "2026-01-19" }));
});

test("CIPA lê planilha de eleitores e normaliza cabeçalhos", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Matrícula", "Nome", "CPF", "Data de nascimento", "Data de admissão"], ["001", "Maria da Silva", "529.982.247-25", "01/01/1990", "02/01/2020"]]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Eleitores");
  const rows = lerCipaImportacao(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), "eleitores.xlsx");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].matricula, "001");
  assert.equal(rows[0].nomeCompleto, "Maria da Silva");
});
