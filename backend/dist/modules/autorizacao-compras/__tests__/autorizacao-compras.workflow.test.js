import test from "node:test";
import assert from "node:assert/strict";
import { calcularResumoCotacoes, calcularValorTotalItens, DEFAULT_APPROVAL_LEVELS, determinarNiveisObrigatorios, gerarNumeroAutorizacaoPagamento, gerarNumeroReserva, gerarNumeroSolicitacao, resumirOrcamento } from "../autorizacao-compras.workflow.js";
test("calcula o valor total dos itens da solicitacao", () => {
    const total = calcularValorTotalItens([
        {
            descricao: "Notebook",
            quantidade: 2,
            unidade: "un",
            valorEstimado: 3500,
            tipoItem: "bem"
        },
        {
            descricao: "Suporte",
            quantidade: 3,
            unidade: "un",
            valorEstimado: 120.5,
            tipoItem: "material"
        }
    ]);
    assert.equal(total, 7361.5);
});
test("determina aprovacoes cumulativas conforme a alcada do valor", () => {
    const niveis = DEFAULT_APPROVAL_LEVELS.map((nivel, index) => ({
        id: BigInt(index + 1),
        codigo: nivel.codigo,
        nome: nivel.nome,
        ordem: nivel.ordem,
        valor_minimo: nivel.valorMinimo,
        valor_maximo: nivel.valorMaximo,
        permissao_requerida: nivel.permissaoRequerida,
        ativo: true,
        criado_em: new Date(),
        atualizado_em: new Date()
    }));
    const niveisObrigatorios = determinarNiveisObrigatorios(18000, niveis);
    assert.deepEqual(niveisObrigatorios.map((nivel) => nivel.codigo), ["COORDENACAO", "GERENCIA"]);
});
test("resume o orcamento e sinaliza extrapolacao", () => {
    const resumo = resumirOrcamento(10000, 7600, 3000);
    assert.equal(resumo.saldoDisponivel, 2400);
    assert.equal(resumo.extrapola, true);
});
test("calcula sugestao de vencedor pelo menor preco", () => {
    const cotacoes = [
        {
            id: 1n,
            autorizacao_compra_id: 10n,
            fornecedor: "Fornecedor A",
            razao_social: "Fornecedor A Ltda",
            cnpj: "00000000000191",
            contato: "Maria",
            telefone: "11999999999",
            email: "a@g3.com",
            valor: 1200,
            prazo_entrega: null,
            forma_pagamento: "Pix",
            validade: null,
            observacoes: null,
            data_cotacao: new Date(),
            orcamento_arquivo_id: null,
            cartao_cnpj_arquivo_id: null,
            ativo: true,
            criado_em: new Date(),
            atualizado_em: new Date()
        },
        {
            id: 2n,
            autorizacao_compra_id: 10n,
            fornecedor: "Fornecedor B",
            razao_social: "Fornecedor B Ltda",
            cnpj: "00000000000272",
            contato: "Joao",
            telefone: "11988888888",
            email: "b@g3.com",
            valor: 990,
            prazo_entrega: null,
            forma_pagamento: "Boleto",
            validade: null,
            observacoes: null,
            data_cotacao: new Date(),
            orcamento_arquivo_id: null,
            cartao_cnpj_arquivo_id: null,
            ativo: true,
            criado_em: new Date(),
            atualizado_em: new Date()
        }
    ];
    const resumo = calcularResumoCotacoes(cotacoes, 1n);
    assert.equal(resumo.menor?.fornecedor, "Fornecedor B");
    assert.equal(resumo.divergenciaValor, 210);
});
test("gera numeracoes padronizadas para solicitacao, reserva e pagamento", () => {
    const data = new Date("2026-03-14T12:00:00.000Z");
    assert.equal(gerarNumeroSolicitacao(15, data), "SC-2026-000015");
    assert.equal(gerarNumeroReserva(15, data), "RES-2026-000015");
    assert.equal(gerarNumeroAutorizacaoPagamento(15, data), "AP-2026-000015");
});
