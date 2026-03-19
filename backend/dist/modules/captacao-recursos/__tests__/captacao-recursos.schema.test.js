import assert from "node:assert/strict";
import test from "node:test";
import { captacaoCampanhaInputSchema, captacaoDoadorInputSchema, captacaoPortalLoginSchema } from "../captacao-recursos.schema.js";
test("captacaoDoadorInputSchema aceita doador anonimo sem documento", () => {
    const resultado = captacaoDoadorInputSchema.parse({
        tipoDoador: "anonimo",
        nome: "Doador anônimo",
        status: "ativo"
    });
    assert.equal(resultado.tipoDoador, "anonimo");
    assert.equal(resultado.nome, "Doador anônimo");
    assert.equal(resultado.cpfCnpj, undefined);
});
test("captacaoDoadorInputSchema rejeita CPF invalido para pessoa fisica", () => {
    assert.throws(() => captacaoDoadorInputSchema.parse({
        tipoDoador: "pessoa_fisica",
        nome: "Maria doadora",
        cpfCnpj: "111.111.111-11",
        status: "ativo"
    }));
});
test("captacaoCampanhaInputSchema normaliza data em dd-mm-aaaa e valida cor hexadecimal", () => {
    const resultado = captacaoCampanhaInputSchema.parse({
        nome: "Campanha inverno solidário",
        tipo: "sazonal",
        status: "ativa",
        dataInicial: "18-03-2026",
        corDestaque: "#0F766E"
    });
    assert.equal(resultado.dataInicial, "2026-03-18");
    assert.equal(resultado.corDestaque, "#0F766E");
});
test("captacaoPortalLoginSchema normaliza e-mail informado pelo doador", () => {
    const resultado = captacaoPortalLoginSchema.parse({
        email: "  DOADOR@EXEMPLO.ORG ",
        documento: "12345678900"
    });
    assert.equal(resultado.email, "doador@exemplo.org");
});
