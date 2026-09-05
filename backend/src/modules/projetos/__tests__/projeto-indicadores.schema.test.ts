import test from "node:test";
import assert from "node:assert/strict";
import { projetoIndicadorInputSchema, projetoIndicadorMedicaoSchema } from "../projeto-indicadores.schema.js";

test("indicador exige meta não negativa e unidade de medida", () => {
  assert.equal(projetoIndicadorInputSchema.safeParse({ nome: "Atendidos", tipo: "RESULTADO", unidade_medida: "pessoas", meta: 100, periodicidade: "MENSAL" }).success, true);
  assert.equal(projetoIndicadorInputSchema.safeParse({ nome: "Atendidos", tipo: "RESULTADO", unidade_medida: "pessoas", meta: -1, periodicidade: "MENSAL" }).success, false);
});

test("medição valida competência e evidência opcional", () => {
  assert.equal(projetoIndicadorMedicaoSchema.safeParse({ competencia: "2026-09-01", valor: 10, evidencia_id: 3 }).success, true);
  assert.equal(projetoIndicadorMedicaoSchema.safeParse({ competencia: "01/09/2026", valor: 10 }).success, false);
});
