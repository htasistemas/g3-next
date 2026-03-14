import test from "node:test";
import assert from "node:assert/strict";
import { calcularSaldoConta, gerarNumeroRecibo, isStatusEmAberto, lancamentoEstaBloqueadoPorOrigem, normalizarStatusLancamento, normalizarTipoConta } from "../contabilidade.workflow.js";
test("normaliza tipos de conta para os valores oficiais", () => {
    assert.equal(normalizarTipoConta("caixa"), "CAIXA_INTERNO");
    assert.equal(normalizarTipoConta("poupança"), "POUPANCA");
    assert.equal(normalizarTipoConta("conta corrente"), "CONTA_CORRENTE");
});
test("define status padrao coerente para receitas e despesas", () => {
    assert.equal(normalizarStatusLancamento(undefined, "RECEITA"), "AGUARDANDO_RECEBIMENTO");
    assert.equal(normalizarStatusLancamento(undefined, "DESPESA"), "AGUARDANDO_PAGAMENTO");
    assert.equal(normalizarStatusLancamento("pago", "DESPESA"), "PAGO");
});
test("calcula saldo e recibo financeiro de forma padronizada", () => {
    assert.equal(calcularSaldoConta(1000, 250, "ENTRADA"), 1250);
    assert.equal(calcularSaldoConta(1000, 250, "SAIDA"), 750);
    assert.equal(gerarNumeroRecibo(12), "FIN-000012");
});
test("sinaliza pendencias abertas e bloqueio por origem de compra", () => {
    assert.equal(isStatusEmAberto("PENDENTE"), true);
    assert.equal(isStatusEmAberto("PAGO"), false);
    assert.equal(lancamentoEstaBloqueadoPorOrigem("compra"), true);
    assert.equal(lancamentoEstaBloqueadoPorOrigem("manual"), false);
});
