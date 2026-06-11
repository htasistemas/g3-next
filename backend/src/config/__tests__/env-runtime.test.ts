import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRuntimeEnv } from "../env-runtime.js";

test("monta DATABASE_URL a partir do padrao legado DB_*", () => {
  const env = normalizeRuntimeEnv({
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "g3",
    DB_USERNAME: "postgres",
    DB_PASSWORD: "admin"
  });

  assert.equal(env.DATABASE_URL, "postgresql://postgres:admin@localhost:5432/g3?schema=public");
});

test("usa DATABASE_URL padrao de desenvolvimento quando nenhuma variavel de banco foi informada", () => {
  const env = normalizeRuntimeEnv({});

  assert.equal(env.DATABASE_URL, "postgresql://postgres:admin@localhost:5432/g3n?schema=public");
});

test("desabilita email no desenvolvimento quando MAIL_PASS nao foi configurada", () => {
  const env = normalizeRuntimeEnv({});

  assert.equal(env.APP_EMAIL_HABILITADO, "false");
});

test("preserva configuracao explicita de email mesmo sem MAIL_PASS", () => {
  const env = normalizeRuntimeEnv({
    APP_EMAIL_HABILITADO: "true"
  });

  assert.equal(env.APP_EMAIL_HABILITADO, "true");
});
