import test from "node:test";
import assert from "node:assert/strict";
import { escopoPermite, exigirEscopo } from "../services/organizational-scope.service.js";
const instituicao = "instituicao-a";
test("escopo institucional permite estruturas filhas da mesma instituição", () => {
    assert.equal(escopoPermite({ instituicao_id: instituicao, escopo: "INSTITUICAO" }, {
        instituicao_id: instituicao, unidade_id: "u-1", projeto_id: "p-1"
    }), true);
});
test("escopo de projeto não herda acesso para outro projeto", () => {
    const acesso = { instituicao_id: instituicao, projeto_id: "p-1", escopo: "PROJETO" };
    assert.equal(escopoPermite(acesso, { instituicao_id: instituicao, projeto_id: "p-2" }), false);
    assert.equal(escopoPermite(acesso, { instituicao_id: "instituicao-b", projeto_id: "p-1" }), false);
});
test("exigirEscopo responde 403 para instituição cruzada", () => {
    assert.throws(() => exigirEscopo([
        { instituicao_id: instituicao, escopo: "INSTITUICAO" }
    ], { instituicao_id: "instituicao-b" }), (error) => {
        return error instanceof Error && "statusCode" in error && error.statusCode === 403;
    });
});
