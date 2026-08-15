import test from "node:test";
import assert from "node:assert/strict";
import { localDestinoInputSchema, motoristaAutorizadoInputSchema } from "../controle-veiculos.schema.js";
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
test("motoristaAutorizadoInputSchema aceita profissional como origem", () => {
    const resultado = motoristaAutorizadoInputSchema.parse({
        veiculoId: 1,
        tipoOrigem: "profissional",
        motoristaId: 10
    });
    assert.equal(resultado.tipoOrigem, "PROFISSIONAL");
});
test("motoristaAutorizadoInputSchema aceita voluntario como origem", () => {
    const resultado = motoristaAutorizadoInputSchema.parse({
        veiculoId: 1,
        tipoOrigem: "voluntário",
        motoristaId: 10
    });
    assert.equal(resultado.tipoOrigem, "VOLUNTARIO");
});
test("motoristaAutorizadoInputSchema rejeita origem fora de profissionais e voluntarios", () => {
    assert.throws(() => motoristaAutorizadoInputSchema.parse({
        veiculoId: 1,
        tipoOrigem: "motorista",
        motoristaId: 10
    }));
});
