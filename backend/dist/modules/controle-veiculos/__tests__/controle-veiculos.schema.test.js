import test from "node:test";
import assert from "node:assert/strict";
import { localDestinoInputSchema } from "../controle-veiculos.schema.js";
test("localDestinoInputSchema aceita telefone mascarado", () => {
    const resultado = localDestinoInputSchema.parse({
        nome: "Unidade Centro",
        endereco: "Rua das Flores, 100",
        telefone: "(34) 99999-9999"
    });
    assert.equal(resultado.telefone, "(34) 99999-9999");
});
test("localDestinoInputSchema rejeita telefone invalido", () => {
    assert.throws(() => localDestinoInputSchema.parse({
        nome: "Unidade Centro",
        telefone: "12345"
    }));
});
