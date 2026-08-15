import test from "node:test";
import assert from "node:assert/strict";
import { informacaoAdministrativaCategoriaComSenhaSchema, informacaoAdministrativaComSenhaSchema, senhaConfirmacaoSchema } from "../informacoes-administrativas.schema.js";
test("informacaoAdministrativaComSenhaSchema normaliza campos textuais validos", () => {
    const parsed = informacaoAdministrativaComSenhaSchema.parse({
        categoria: " Internet ",
        titulo: " Roteador principal ",
        descricao: "  Dados de acesso interno  ",
        usuarioAcesso: " admin ",
        senhaAcesso: " senha-segura ",
        link: " http://192.168.1.1 ",
        observacoes: " Sala administrativa ",
        senhaConfirmacao: "senha-do-usuario"
    });
    assert.equal(parsed.categoria, "Internet");
    assert.equal(parsed.titulo, "Roteador principal");
    assert.equal(parsed.descricao, "Dados de acesso interno");
    assert.equal(parsed.usuarioAcesso, "admin");
    assert.equal(parsed.link, "http://192.168.1.1");
});
test("informacaoAdministrativaComSenhaSchema rejeita titulo vazio", () => {
    assert.throws(() => informacaoAdministrativaComSenhaSchema.parse({
        categoria: "Internet",
        titulo: " ",
        senhaConfirmacao: "senha-do-usuario"
    }));
});
test("senhaConfirmacaoSchema exige senha informada", () => {
    assert.throws(() => senhaConfirmacaoSchema.parse({ senhaConfirmacao: "" }));
});
test("informacaoAdministrativaCategoriaComSenhaSchema normaliza categoria valida", () => {
    const parsed = informacaoAdministrativaCategoriaComSenhaSchema.parse({
        nome: "  Internet administrativa  ",
        ativo: true,
        senhaConfirmacao: "senha-do-usuario"
    });
    assert.equal(parsed.nome, "Internet administrativa");
    assert.equal(parsed.ativo, true);
});
test("informacaoAdministrativaCategoriaComSenhaSchema rejeita nome vazio", () => {
    assert.throws(() => informacaoAdministrativaCategoriaComSenhaSchema.parse({
        nome: " ",
        senhaConfirmacao: "senha-do-usuario"
    }));
});
