import assert from "node:assert/strict";
import test from "node:test";
import {
  montarMensagemAlteracoesBeneficiario,
  montarResumoAlteracoesBeneficiario,
  obterDestinatariosAlteracaoBeneficiario
} from "../services/beneficiario-email-notificacao.js";

test("montarResumoAlteracoesBeneficiario descreve as alteracoes do cadastro", () => {
  const anterior = {
    codigo: "0001",
    nome_completo: "Maria Eduarda Lopes",
    email: "dudalopesfreitasbr@gmail.com",
    telefone_principal: "34999990000",
    documentos_obrigatorios: [{ nome: "CPF", nomeArquivo: "cpf-antigo.pdf" }]
  };

  const atual = {
    codigo: "0001",
    nome_completo: "Maria Eduarda Lopes Freitas",
    email: "dudalopesfreitasbr@gmail.com",
    telefone_principal: "34988887777",
    documentos_obrigatorios: [
      { nome: "CPF", nomeArquivo: "cpf-atualizado.pdf" },
      { nome: "Cartão SUS", nomeArquivo: "sus.pdf" }
    ]
  };

  const alteracoes = montarResumoAlteracoesBeneficiario(anterior, atual);

  assert.deepEqual(alteracoes, [
    'Documentos obrigatórios: de "CPF (cpf-antigo.pdf)" para "Cartão SUS (sus.pdf), CPF (cpf-atualizado.pdf)".',
    'Nome completo: de "Maria Eduarda Lopes" para "Maria Eduarda Lopes Freitas".',
    'Telefone principal: de "34999990000" para "34988887777".'
  ]);
});

test("obterDestinatariosAlteracaoBeneficiario deduplica os emails antigo e atual", () => {
  const destinatarios = obterDestinatariosAlteracaoBeneficiario(
    { email: "dudalopesfreitasbr@gmail.com" },
    { email: "DUDALOPESFREITASBR@gmail.com " }
  );

  assert.deepEqual(destinatarios, ["dudalopesfreitasbr@gmail.com"]);
});

test("montarMensagemAlteracoesBeneficiario gera o corpo do e-mail automatico", () => {
  const mensagem = montarMensagemAlteracoesBeneficiario(
    {
      codigo: "0001",
      nome_completo: "Maria Eduarda Lopes Freitas"
    },
    ['Nome completo: de "Maria Eduarda Lopes" para "Maria Eduarda Lopes Freitas".']
  );

  assert.match(mensagem, /Maria Eduarda Lopes Freitas/);
  assert.match(mensagem, /Código: 0001/);
  assert.match(mensagem, /Alterações realizadas:/);
});
