import assert from "node:assert/strict";
import test from "node:test";
import { eventoCarteiraInputSchema, itemEventoInputSchema } from "../carteira-evento.schema.js";

test("eventoCarteiraInputSchema aceita status finalizado", () => {
  const resultado = eventoCarteiraInputSchema.parse({
    nome_evento: "Festa beneficente de agosto",
    tipo_evento: "FESTA_BARRACAS",
    data_inicio: "2026-08-15",
    status: "FINALIZADO",
    permite_recarga: true,
    permite_transferencia: true,
    permite_estorno: true,
    modo_financeiro: "SIMPLES"
  });

  assert.equal(resultado.status, "FINALIZADO");
});

test("eventoCarteiraInputSchema rejeita status encerrado para evento", () => {
  assert.throws(() =>
    eventoCarteiraInputSchema.parse({
      nome_evento: "Festa beneficente de agosto",
      tipo_evento: "FESTA_BARRACAS",
      data_inicio: "2026-08-15",
      status: "ENCERRADO",
      permite_recarga: true,
      permite_transferencia: true,
      permite_estorno: true,
      modo_financeiro: "SIMPLES"
    })
  );
});

test("itemEventoInputSchema rejeita produto sem nome operacional e preco negativo", () => {
  assert.throws(() =>
    itemEventoInputSchema.parse({
      evento_id: 1,
      nome_item: "A",
      categoria: "ALIMENTO",
      preco: -1,
      ativo: true
    })
  );
});
