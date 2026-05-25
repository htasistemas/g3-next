import assert from "node:assert/strict";
import test from "node:test";
import { calcularSituacaoDocumentoInstituicao } from "../documentos-instituicao-status.js";

test("considera validade no proprio dia como vigente ao recalcular documento renovado", () => {
  const referencia = new Date(2026, 4, 25, 10, 0, 0, 0);

  assert.equal(
    calcularSituacaoDocumentoInstituicao(
      {
        validade: "2026-05-25",
        diasAntecedencia: [30],
        emRenovacao: false,
        semVencimento: false,
        vencimentoIndeterminado: false
      },
      referencia
    ),
    "vence_em_breve"
  );
});

test("considera vencido apenas quando a validade ficou antes do dia atual", () => {
  const referencia = new Date(2026, 4, 25, 10, 0, 0, 0);

  assert.equal(
    calcularSituacaoDocumentoInstituicao(
      {
        validade: "2026-05-24",
        diasAntecedencia: [30],
        emRenovacao: false,
        semVencimento: false,
        vencimentoIndeterminado: false
      },
      referencia
    ),
    "vencido"
  );
});
