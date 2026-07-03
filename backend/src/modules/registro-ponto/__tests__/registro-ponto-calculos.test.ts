import assert from "node:assert/strict";
import test from "node:test";
import { calcularDesviosRegistroPonto } from "../registro-ponto-calculos.js";

test("calcula horas extras quando a batida acontece antes ou depois do previsto", () => {
  const resultado = calcularDesviosRegistroPonto(
    {
      entrada_1: "08:00",
      saida_1: "12:00",
      entrada_2: "13:00",
      saida_2: "17:00"
    },
    {
      entrada_1: "07:45",
      saida_1: "12:15",
      entrada_2: "12:50",
      saida_2: "17:20"
    }
  );

  assert.equal(resultado.horas_extras_minutos, 60);
  assert.equal(resultado.atrasos_minutos, 0);
  assert.equal(resultado.banco_horas_minutos, 60);
  assert.deepEqual(resultado.detalhes, [
    { campo: "entrada_1", minutos: 15, tipo: "HORA_EXTRA" },
    { campo: "saida_1", minutos: 15, tipo: "HORA_EXTRA" },
    { campo: "entrada_2", minutos: 10, tipo: "HORA_EXTRA" },
    { campo: "saida_2", minutos: 20, tipo: "HORA_EXTRA" }
  ]);
});

test("calcula atrasos e saldo negativo quando a batida ocorre fora do horario", () => {
  const resultado = calcularDesviosRegistroPonto(
    {
      entrada_1: "08:00",
      saida_1: "12:00",
      entrada_2: "13:00",
      saida_2: "17:00"
    },
    {
      entrada_1: "08:20",
      saida_1: "11:40",
      entrada_2: "13:15",
      saida_2: "16:30"
    }
  );

  assert.equal(resultado.horas_extras_minutos, 0);
  assert.equal(resultado.atrasos_minutos, 85);
  assert.equal(resultado.banco_horas_minutos, -85);
  assert.deepEqual(resultado.detalhes, [
    { campo: "entrada_1", minutos: 20, tipo: "ATRASO" },
    { campo: "saida_1", minutos: 20, tipo: "ATRASO" },
    { campo: "entrada_2", minutos: 15, tipo: "ATRASO" },
    { campo: "saida_2", minutos: 30, tipo: "ATRASO" }
  ]);
});

test("usa jornada padrao quando alguns horarios nao estiverem configurados", () => {
  const resultado = calcularDesviosRegistroPonto(
    {
      entrada_1: "08:00",
      saida_1: null,
      entrada_2: undefined,
      saida_2: "17:00"
    },
    {
      entrada_1: "07:50",
      saida_1: "12:10",
      entrada_2: null,
      saida_2: undefined
    }
  );

  assert.equal(resultado.horas_extras_minutos, 20);
  assert.equal(resultado.atrasos_minutos, 0);
  assert.equal(resultado.banco_horas_minutos, 20);
  assert.deepEqual(resultado.detalhes, [
    { campo: "entrada_1", minutos: 10, tipo: "HORA_EXTRA" },
    { campo: "saida_1", minutos: 10, tipo: "HORA_EXTRA" }
  ]);
});

test("usa jornada padrao quando o horario previsto nao estiver configurado", () => {
  const resultado = calcularDesviosRegistroPonto(
    {},
    {
      entrada_1: "07:46",
      saida_1: "12:00",
      entrada_2: "13:01",
      saida_2: "17:07"
    }
  );

  assert.equal(resultado.horas_extras_minutos, 21);
  assert.equal(resultado.atrasos_minutos, 1);
  assert.equal(resultado.banco_horas_minutos, 20);
});
