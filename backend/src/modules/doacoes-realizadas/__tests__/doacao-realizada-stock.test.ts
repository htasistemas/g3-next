import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../../shared/errors/app-error.js";
import { calcularSaldoMovimentacaoDoacao } from "../repositories/doacao-realizada.repository.js";

test("deve baixar o estoque ao registrar doacao entregue", () => {
  const saldo = calcularSaldoMovimentacaoDoacao(12, 5, "Saida");
  assert.equal(saldo, 7);
});

test("deve restaurar o estoque ao estornar uma doacao", () => {
  const saldo = calcularSaldoMovimentacaoDoacao(7, 5, "Entrada");
  assert.equal(saldo, 12);
});

test("deve impedir baixa quando nao houver estoque suficiente", () => {
  assert.throws(
    () => calcularSaldoMovimentacaoDoacao(3, 5, "Saida"),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "Estoque insuficiente para registrar a doacao."
  );
});
