import test from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { patrimonioInputSchema } from "../patrimonio.schema.js";

function criarPayloadValido() {
  return {
    numeroPatrimonio: "240",
    nome: "Notebook administrativo",
    unidade: "Unidade Central"
  };
}

test("patrimonioInputSchema aceita patrimônio com unidade", () => {
  const resultado = patrimonioInputSchema.parse({
    ...criarPayloadValido(),
    unidadeId: "12",
    unidade: "  Unidade Central  "
  });

  assert.equal(resultado.unidadeId, "12");
  assert.equal(resultado.unidade, "Unidade Central");
});

test("patrimonioInputSchema aceita patrimônio com unidadeId sem nome da unidade", () => {
  const resultado = patrimonioInputSchema.parse({
    numeroPatrimonio: "240",
    nome: "Notebook administrativo",
    unidadeId: "12"
  });

  assert.equal(resultado.unidadeId, "12");
  assert.equal(resultado.unidade, undefined);
});

test("patrimonioInputSchema rejeita cadastro sem unidade", () => {
  assert.throws(
    () =>
      patrimonioInputSchema.parse({
        ...criarPayloadValido(),
        unidade: "   "
      }),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.equal(error.issues[0]?.path.join("."), "unidade");
      return true;
    }
  );
});
