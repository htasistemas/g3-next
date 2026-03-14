import assert from "node:assert/strict";
import test from "node:test";
import { detectarMimeTypePorAssinatura, normalizarCaminhoLogico, parseBase64Payload } from "../storage-utils.js";
test("normalizarCaminhoLogico aceita caminho relativo valido", () => {
    assert.equal(normalizarCaminhoLogico("beneficiarios\\fotos\\2026\\03\\arquivo.jpg"), "beneficiarios/fotos/2026/03/arquivo.jpg");
});
test("normalizarCaminhoLogico rejeita tentativa de escapar do storage", () => {
    assert.throws(() => normalizarCaminhoLogico("../segredo.txt"));
});
test("parseBase64Payload interpreta data uri corretamente", () => {
    const payload = parseBase64Payload("data:text/plain;base64,YWJj");
    assert.equal(payload.mimeType, "text/plain");
    assert.equal(payload.buffer.toString("utf-8"), "abc");
});
test("detectarMimeTypePorAssinatura reconhece jpeg", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    assert.equal(detectarMimeTypePorAssinatura(jpeg), "image/jpeg");
});
