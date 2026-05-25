import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateLocal,
  formatDateTimeLocal,
  parseDateOnlyLocal,
  parseDateTimeLocal
} from "../emprestimos-eventos-datetime.js";

test("parseDateOnlyLocal preserva o dia civil informado", () => {
  const data = parseDateOnlyLocal("2026-05-25");
  assert.ok(data);
  assert.equal(data?.getFullYear(), 2026);
  assert.equal(data?.getMonth(), 4);
  assert.equal(data?.getDate(), 25);
});

test("parseDateTimeLocal preserva hora local do datetime-local", () => {
  const data = parseDateTimeLocal("2026-05-25T14:30");
  assert.ok(data);
  assert.equal(data?.getHours(), 14);
  assert.equal(data?.getMinutes(), 30);
});

test("formatDateTimeLocal retorna texto compativel com input datetime-local", () => {
  const data = new Date(2026, 4, 25, 14, 30, 0, 0);
  assert.equal(formatDateTimeLocal(data), "2026-05-25T14:30");
  assert.equal(formatDateLocal(data), "2026-05-25");
});
