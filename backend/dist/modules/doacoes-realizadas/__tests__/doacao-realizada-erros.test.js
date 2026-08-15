import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { AppError } from "../../../shared/errors/app-error.js";
import { calcularSaldoMovimentacaoDoacao, tratarErroPersistenciaDoacaoRealizada } from "../repositories/doacao-realizada.repository.js";
function criarErroPrisma(code, meta = {}, message = "Falha de persistencia") {
    return new Prisma.PrismaClientKnownRequestError(message, {
        code,
        clientVersion: "test",
        meta
    });
}
test("deve traduzir violacao de unicidade em conflito da entrega", () => {
    assert.throws(() => tratarErroPersistenciaDoacaoRealizada(criarErroPrisma("P2002", { target: ["doacao_realizada_item"] }, "Unique constraint failed")), (error) => error instanceof AppError &&
        error.statusCode === 409 &&
        error.message === "Esta entrega ja foi registrada.");
});
test("deve traduzir referencia invalida em erro de validacao", () => {
    assert.throws(() => tratarErroPersistenciaDoacaoRealizada(criarErroPrisma("P2003", { field_name: "almoxarifado_item_id" }, "Foreign key violation")), (error) => error instanceof AppError &&
        error.statusCode === 400 &&
        error.message.includes("nao pertence a esta instituicao"));
});
test("deve traduzir registro ausente em not found", () => {
    assert.throws(() => tratarErroPersistenciaDoacaoRealizada(criarErroPrisma("P2025", {}, "Record not found")), (error) => error instanceof AppError &&
        error.statusCode === 404 &&
        error.message === "Doacao realizada nao encontrada.");
});
test("deve manter saldo coerente ao registrar e restaurar estoque", () => {
    assert.equal(calcularSaldoMovimentacaoDoacao(10, 3, "Saida"), 7);
    assert.equal(calcularSaldoMovimentacaoDoacao(7, 3, "Entrada"), 10);
});
