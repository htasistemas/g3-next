import assert from "node:assert/strict";
import test from "node:test";
import {
  deveEnviarAlertaEmailDocumento,
  montarMensagemAlertaEmailDocumentos,
  montarObservacaoHistoricoAlertaEmailDocumento
} from "../documentos-instituicao.alertas.js";

test("deveEnviarAlertaEmailDocumento considera apenas documentos com alerta ativo e status critico", () => {
  assert.equal(deveEnviarAlertaEmailDocumento({ gerarAlerta: true, situacao: "vencido" }), true);
  assert.equal(
    deveEnviarAlertaEmailDocumento({ gerarAlerta: true, situacao: "vence_em_breve" }),
    true
  );
  assert.equal(deveEnviarAlertaEmailDocumento({ gerarAlerta: false, situacao: "vencido" }), false);
  assert.equal(deveEnviarAlertaEmailDocumento({ gerarAlerta: true, situacao: "valido" }), false);
});

test("montarObservacaoHistoricoAlertaEmailDocumento gera texto deterministico por data e situacao", () => {
  assert.equal(
    montarObservacaoHistoricoAlertaEmailDocumento(
      { situacao: "vencido", validade: "2026-03-10" },
      "2026-03-18"
    ),
    "Alerta automatico de documento vencido enviado em 18-03-2026. Validade registrada: 10-03-2026."
  );
});

test("montarMensagemAlertaEmailDocumentos agrega os documentos no corpo do email", () => {
  const mensagem = montarMensagemAlertaEmailDocumentos(
    "Casa Sede",
    [
      {
        id: "1",
        tipoDocumento: "Certidao negativa federal",
        orgaoEmissor: "Receita Federal",
        validade: "2026-03-20",
        situacao: "vence_em_breve",
        gerarAlerta: true
      }
    ],
    "2026-03-18"
  );

  assert.match(mensagem, /Casa Sede/);
  assert.match(mensagem, /Certidao negativa federal/);
  assert.match(mensagem, /A vencer/);
  assert.match(mensagem, /20-03-2026/);
});
