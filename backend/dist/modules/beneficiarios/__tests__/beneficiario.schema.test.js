import test from "node:test";
import assert from "node:assert/strict";
import { beneficiarioInputSchema } from "../beneficiario.schema.js";
function criarPayloadValido() {
    return {
        status: "EM_ANALISE",
        nome_completo: "Maria da Silva",
        data_nascimento: "2000-01-15",
        nome_mae: "Ana da Silva",
        cep: "38400000",
        telefone_principal: "34999999999",
        cpf: "52998224725",
        aceite_lgpd: true
    };
}
test("beneficiarioInputSchema aceita e-mail vazio", () => {
    const resultado = beneficiarioInputSchema.parse({
        ...criarPayloadValido(),
        email: "   "
    });
    assert.equal(resultado.email, undefined);
});
test("beneficiarioInputSchema normaliza e-mail informado", () => {
    const resultado = beneficiarioInputSchema.parse({
        ...criarPayloadValido(),
        email: "  Pessoa@Exemplo.COM.BR "
    });
    assert.equal(resultado.email, "pessoa@exemplo.com.br");
});
test("beneficiarioInputSchema rejeita e-mail inválido quando informado", () => {
    assert.throws(() => beneficiarioInputSchema.parse({
        ...criarPayloadValido(),
        email: "email-invalido"
    }));
});
