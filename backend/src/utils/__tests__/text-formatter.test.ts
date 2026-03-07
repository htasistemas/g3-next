import assert from "node:assert/strict";
import test from "node:test";
import {
  formatarEndereco,
  formatarNomeInstituicao,
  formatarNomePessoa,
  formatarTextoCurto,
  formatarTextoPorCampo,
  normalizarEspacos
} from "../text-formatter.js";

test("formatar nome de pessoa com conectivos e espacos extras", () => {
  assert.equal(
    formatarNomePessoa("  ADRIANO   DA   SILVA  OLIVEIRA "),
    "Adriano da Silva Oliveira"
  );
  assert.equal(formatarNomePessoa("MARIA DE SOUZA LIMA"), "Maria de Souza Lima");
  assert.equal(formatarNomePessoa("  JOSE   DOS   SANTOS   "), "Jose dos Santos");
});

test("formatar endereco e instituicao", () => {
  assert.equal(formatarEndereco("RUA DAS FLORES"), "Rua das Flores");
  assert.equal(formatarEndereco("AVENIDA JOAO PESSOA"), "Avenida Joao Pessoa");
  assert.equal(formatarEndereco("JARDIM BRASIL"), "Jardim Brasil");
  assert.equal(
    formatarNomeInstituicao("SECRETARIA DE ASSISTENCIA SOCIAL"),
    "Secretaria de Assistencia Social"
  );
  assert.equal(
    formatarNomeInstituicao("CENTRO DE REFERENCIA DO CRAS"),
    "Centro de Referencia do CRAS"
  );
});

test("preservar siglas conhecidas", () => {
  assert.equal(formatarNomeInstituicao("CARTEIRA SUS"), "Carteira SUS");
  assert.equal(formatarNomeInstituicao("NUMERO DO CPF"), "Numero do CPF");
  assert.equal(formatarNomeInstituicao("ATENDIMENTO NO CRAS"), "Atendimento no CRAS");
});

test("respeitar campos tecnicos sem alterar capitalizacao", () => {
  const mapaTeste = {
    email: "textoCurto",
    username: "textoCurto",
    url: "textoCurto",
    cpf: "textoCurto"
  } as const;

  assert.equal(
    formatarTextoPorCampo("email", "email@example.com", mapaTeste),
    "email@example.com"
  );
  assert.equal(formatarTextoPorCampo("username", "admin_master", mapaTeste), "admin_master");
  assert.equal(formatarTextoPorCampo("url", "https://site.com.br", mapaTeste), "https://site.com.br");
  assert.equal(formatarTextoPorCampo("cpf", "12345678900", mapaTeste), "12345678900");
});

test("normalizar espacos e manter casos especiais seguros", () => {
  assert.equal(normalizarEspacos("  ADRIANO   DA   SILVA  "), "ADRIANO DA SILVA");
  assert.equal(formatarNomePessoa("JOAO PAULO II"), "Joao Paulo II");
  assert.equal(formatarEndereco("SALA 02 BLOCO A"), "Sala 02 Bloco A");
});

test("nao forcar title case em texto livre complexo", () => {
  const texto = "OBSERVACAO GERAL: manter protocolo interno e URL https://site.com.br para auditoria.";
  assert.equal(formatarTextoCurto(texto), texto);
});
