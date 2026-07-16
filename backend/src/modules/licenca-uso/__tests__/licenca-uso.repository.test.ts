import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../../database/prisma.js";
import { LicencaUsoRepository } from "../repositories/licenca-uso.repository.js";
import type { LicencaUsoConfiguracao } from "../licenca-uso.types.js";

function textoDaQuery(query: unknown) {
  if (typeof query === "string") return query;
  if (!query || typeof query !== "object") return "";
  const valor = query as Record<string, unknown>;
  if (typeof valor.sql === "string") return valor.sql;
  if (typeof valor.text === "string") return valor.text;
  return String(query);
}

function criarConfiguracaoBase(): LicencaUsoConfiguracao {
  return {
    planoId: "profissional",
    cicloCobranca: "mensal",
    vigenciaInicialDias: 30,
    valorBaseMensal: 497,
    percentualDesconto: 0,
    valorCobranca: 497,
    valorImplantacao: 897,
    implantacaoIsenta: false,
    dataInicioVigencia: "2026-07-01",
    dataVencimento: "2026-07-31",
    statusLicenca: "ativa",
    alertasEmailAtivos: true,
    diasAlertaEmail: [30, 15, 7, 1],
    emailsAlerta: ["financeiro@cliente.org.br"],
    pixAmbiente: "sandbox",
    pixExpiracaoMinutos: 1440,
    pixProvider: "infinitypay",
    cartaoProvider: "infinitypay",
    cartaoAmbiente: "sandbox",
    cartaoTentativasFalha: 2,
    boletoProvider: "infinitypay",
    boletoAmbiente: "sandbox",
    boletoPrazoVencimentoDias: 5,
    checkoutHandle: "Torresoft",
    mensagemCobranca: "Licença ativa"
  };
}

test("salvarConfiguracao e registrarPagamentoPendente usam cast de data nas vigencias", async () => {
  const repository = new LicencaUsoRepository();
  const queryRawUnsafeOriginal = prisma.$queryRawUnsafe;
  const executeRawUnsafeOriginal = prisma.$executeRawUnsafe;
  const queryRawOriginal = prisma.$queryRaw;
  const executeRawOriginal = prisma.$executeRaw;

  const queries: string[] = [];

  const retornoConfiguracao = {
    instituicao_nome: "Cliente Teste",
    instituicao_cnpj: "12345678000199",
    plano_id: "profissional",
    ciclo_cobranca: "mensal",
    vigencia_inicial_dias: 30,
    valor_base_mensal: 497,
    percentual_desconto: 0,
    valor_cobranca: 497,
    valor_implantacao: 897,
    implantacao_isenta: false,
    data_inicio_vigencia: "2026-07-01",
    data_vencimento: "2026-07-31",
    status_licenca: "ativa",
    alertas_email_ativos: true,
    dias_alerta_email: [30, 15, 7, 1],
    emails_alerta: ["financeiro@cliente.org.br"],
    observacoes: null,
    pix_chave: null,
    pix_recebedor: null,
    pix_cidade: null,
    pix_ambiente: "sandbox",
    pix_webhook_url: null,
    pix_expiracao_minutos: 1440,
    pix_provider: "infinitypay",
    cartao_provider: "infinitypay",
    cartao_ambiente: "sandbox",
    cartao_chave_publica: null,
    cartao_chave_privada_ref: null,
    cartao_tentativas_falha: 2,
    boleto_provider: "infinitypay",
    boleto_ambiente: "sandbox",
    boleto_prazo_vencimento_dias: 5,
    boleto_instrucao: null,
    mensagem_cobranca: "Licença ativa",
    checkout_handle: "Torresoft",
    checkout_redirect_url: null,
    ultimo_checkout_url: null,
    ultimo_order_nsu: null,
    ultimo_invoice_slug: null,
    ultima_transaction_nsu: null,
    ultimo_receipt_url: null,
    ultimo_checkout_pago: false,
    ultimo_valor_pago: 0
  };

  const retornoPagamento = {
    id: 1,
    status: "pendente",
    descricao: "Licença G3N Profissional",
    plano_id: "profissional",
    ciclo_cobranca: "mensal",
    vigencia_inicio: "2026-07-01",
    vigencia_fim: "2026-07-31",
    vigencia_dias: 30,
    valor_licenca: 497,
    valor_implantacao: 897,
    valor_total: 1394,
    order_nsu: "LIC-20260716-TESTE",
    invoice_slug: "invoice-teste",
    transaction_nsu: null,
    checkout_url: "https://checkout.teste",
    receipt_url: null,
    created_at: "2026-07-16T00:00:00.000Z",
    paid_at: null
  };

  prisma.$executeRawUnsafe = async (query: unknown) => {
    queries.push(textoDaQuery(query));
    return 0;
  };
  prisma.$executeRaw = async (query: unknown) => {
    queries.push(textoDaQuery(query));
    return 0;
  };
  prisma.$queryRawUnsafe = async (query: unknown) => {
    queries.push(textoDaQuery(query));
    if (queries[queries.length - 1]?.includes("INSERT INTO licenca_uso_configuracoes")) {
      return [retornoConfiguracao];
    }
    if (queries[queries.length - 1]?.includes("INSERT INTO licenca_uso_pagamentos")) {
      return [retornoPagamento];
    }
    return [];
  };
  prisma.$queryRaw = async () => [];

  try {
    await repository.salvarConfiguracao(criarConfiguracaoBase(), "sistema", "tenant-1");
    await repository.registrarPagamentoPendente({
      tenantId: "tenant-1",
      descricao: "Licença G3N Profissional",
      planoId: "profissional",
      cicloCobranca: "mensal",
      vigenciaInicio: "2026-07-01",
      vigenciaFim: "2026-07-31",
      vigenciaDias: 30,
      valorLicenca: 497,
      valorImplantacao: 897,
      valorTotal: 1394,
      orderNsu: "LIC-20260716-TESTE",
      invoiceSlug: "invoice-teste",
      checkoutUrl: "https://checkout.teste"
    });

    const insertConfiguracao = queries.find((sql) => sql.includes("INSERT INTO licenca_uso_configuracoes"));
    const insertPagamento = queries.find((sql) => sql.includes("INSERT INTO licenca_uso_pagamentos"));

    assert.ok(insertConfiguracao?.includes("$12::date"));
    assert.ok(insertConfiguracao?.includes("$13::date"));
    assert.ok(insertPagamento?.includes("$6::date"));
    assert.ok(insertPagamento?.includes("$7::date"));
  } finally {
    prisma.$queryRawUnsafe = queryRawUnsafeOriginal;
    prisma.$executeRawUnsafe = executeRawUnsafeOriginal;
    prisma.$queryRaw = queryRawOriginal;
    prisma.$executeRaw = executeRawOriginal;
  }
});
