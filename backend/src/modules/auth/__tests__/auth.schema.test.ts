import test from "node:test";
import assert from "node:assert/strict";
import { ZodError } from "zod";
import { authEsqueciSenhaSchema, authLoginSchema } from "../auth.schema.js";

test("authLoginSchema permite login master sem CNPJ", () => {
  const resultado = authLoginSchema.parse({
    email: "htasistemas@gmail.com",
    senha: "123456"
  });

  assert.equal(resultado.email, "htasistemas@gmail.com");
  assert.equal(resultado.cnpj, undefined);
});

test("authLoginSchema continua exigindo instituição para outros e-mails", () => {
  assert.throws(
    () =>
      authLoginSchema.parse({
        email: "operador@instituicao.org.br",
        senha: "123456"
      }),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.equal(error.issues[0]?.path.join("."), "cnpj");
      return true;
    }
  );
});

test("authEsqueciSenhaSchema permite recuperação master sem CNPJ", () => {
  const resultado = authEsqueciSenhaSchema.parse({
    email: "htasistemas@gmail.com"
  });

  assert.equal(resultado.email, "htasistemas@gmail.com");
  assert.equal(resultado.cnpj, undefined);
});
