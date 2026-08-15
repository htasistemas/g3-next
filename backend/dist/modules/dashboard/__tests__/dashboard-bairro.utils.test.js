import assert from "node:assert/strict";
import test from "node:test";
import { formatarBairro, normalizarBairro } from "../dashboard-bairro.utils.js";
test("normalizar bairro ignora caixa e acentos para comparação", () => {
    assert.equal(normalizarBairro("LUIZOTE DE FREITAS"), normalizarBairro("luizote de freitas"));
    assert.equal(normalizarBairro("  São JOSE  "), normalizarBairro("sao jose"));
});
test("formatar bairro padroniza exibição", () => {
    assert.equal(formatarBairro("LUIZOTE DE FREITAS"), "Luizote de Freitas");
    assert.equal(formatarBairro("luizote de freitas"), "Luizote de Freitas");
});
