import test from "node:test";
import assert from "node:assert/strict";
import { preInscricaoSchema } from "../portal-inscricoes.schema.js";

const base = { cursoId: 1, nomeCompleto: "Maria da Silva", cpf: "529.982.247-25", dataNascimento: "1990-02-10", termosVersao: "1.0", termosAceitos: true };

test("aceita CPF válido e normaliza máscara", () => {
  const parsed = preInscricaoSchema.parse(base);
  assert.equal(parsed.cpf, "52998224725");
});

test("rejeita CPF inválido", () => {
  assert.throws(() => preInscricaoSchema.parse({ ...base, cpf: "111.111.111-11" }));
});

test("exige aceite dos termos", () => {
  assert.throws(() => preInscricaoSchema.parse({ ...base, termosAceitos: false }));
});
