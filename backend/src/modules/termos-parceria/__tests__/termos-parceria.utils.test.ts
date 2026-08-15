import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../../shared/errors/app-error.js";
import { idBigInt, numeroBrasileiro, validarIntervalo } from "../services/termos-parceria.service.js";

test("normaliza valores monetarios brasileiros sem perder centavos", () => {
  assert.equal(numeroBrasileiro("R$ 1.234.567,89"), 1234567.89);
  assert.equal(numeroBrasileiro("1000,50"), 1000.5);
  assert.equal(numeroBrasileiro(42), 42);
  assert.ok(Number.isNaN(numeroBrasileiro("texto")));
});

test("rejeita periodo invertido e aceita periodo valido", () => {
  assert.doesNotThrow(() => validarIntervalo("2026-01-01", "2026-12-31"));
  assert.throws(() => validarIntervalo("2026-12-31", "2026-01-01"), (error: unknown) => error instanceof AppError && error.statusCode === 422);
});

test("valida identificadores antes de converter para bigint", () => {
  assert.equal(idBigInt("123"), 123n);
  assert.throws(() => idBigInt("abc"), (error: unknown) => error instanceof AppError && error.statusCode === 422);
});
