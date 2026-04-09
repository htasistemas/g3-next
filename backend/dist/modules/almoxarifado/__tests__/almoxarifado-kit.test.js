import assert from "node:assert/strict";
import test from "node:test";
import { calcularEstoqueDisponivelKit, calcularEstoqueMontavelKit, planejarConsumoSaidaKit } from "../almoxarifado-kit.js";
test("calcula quantos kits podem ser montados pela composicao", () => {
    const quantidade = calcularEstoqueMontavelKit([
        { quantidade_item: 2, estoque_componente: 4 },
        { quantidade_item: 1, estoque_componente: 3 },
        { quantidade_item: 5, estoque_componente: 10 }
    ]);
    assert.equal(quantidade, 2);
});
test("soma o estoque fisico com o estoque montavel do kit", () => {
    const quantidade = calcularEstoqueDisponivelKit(1, [
        { quantidade_item: 2, estoque_componente: 4 },
        { quantidade_item: 1, estoque_componente: 3 }
    ]);
    assert.equal(quantidade, 3);
});
test("consome primeiro o estoque fisico e depois a composicao do kit", () => {
    const plano = planejarConsumoSaidaKit(1, 2, [
        { quantidade_item: 2, estoque_componente: 4 },
        { quantidade_item: 1, estoque_componente: 3 }
    ]);
    assert.equal(plano.suficiente, true);
    assert.equal(plano.estoqueDisponivel, 3);
    assert.equal(plano.consumirEstoqueFisico, 1);
    assert.equal(plano.consumirComponentes, 1);
});
