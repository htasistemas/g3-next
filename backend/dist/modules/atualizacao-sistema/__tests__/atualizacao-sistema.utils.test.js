import assert from "node:assert/strict";
import test from "node:test";
import { compararVersoes, existeNovaVersao, formatarDuracaoHumana } from "../services/atualizacao-sistema.utils.js";
test("deve comparar versões numéricas segmentadas corretamente", () => {
    assert.equal(compararVersoes("1.00.170", "1.00.169"), 1);
    assert.equal(compararVersoes("1.00.169", "1.00.170"), -1);
    assert.equal(compararVersoes("1.00.169", "1.00.169"), 0);
    assert.equal(compararVersoes("1.00.169", "1.0.169"), 0);
});
test("deve detectar quando existe nova versão publicada", () => {
    assert.equal(existeNovaVersao("1.00.169", "1.00.170"), true);
    assert.equal(existeNovaVersao("1.00.169", "1.00.169"), false);
    assert.equal(existeNovaVersao("1.00.170", "1.00.169"), false);
});
test("deve formatar duração humana simples", () => {
    assert.equal(formatarDuracaoHumana(0), "0s");
    assert.equal(formatarDuracaoHumana(8_000), "8s");
    assert.equal(formatarDuracaoHumana(65_000), "1min 5s");
});
