import test from "node:test";
import assert from "node:assert/strict";
import { gerarHorariosDisponiveis } from "../agendamento-horarios.js";

test("gera quatro horarios de 30 minutos entre 19:00 e 21:00", () => {
  assert.deepEqual(gerarHorariosDisponiveis("19:00", "21:00", 30), [
    { horarioInicial: "19:00", horarioFinal: "19:30" },
    { horarioInicial: "19:30", horarioFinal: "20:00" },
    { horarioInicial: "20:00", horarioFinal: "20:30" },
    { horarioInicial: "20:30", horarioFinal: "21:00" }
  ]);
});

test("nao cria horario que termine depois do expediente", () => {
  assert.deepEqual(gerarHorariosDisponiveis("19:00", "21:00", 45), [
    { horarioInicial: "19:00", horarioFinal: "19:45" },
    { horarioInicial: "19:45", horarioFinal: "20:30" }
  ]);
});

test("rejeita periodo invalido ou menor que a duracao", () => {
  assert.throws(() => gerarHorariosDisponiveis("21:00", "19:00", 30));
  assert.throws(() => gerarHorariosDisponiveis("19:00", "19:20", 30));
});
