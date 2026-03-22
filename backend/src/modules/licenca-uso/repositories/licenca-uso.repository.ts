import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import type { LicencaUsoAlertaProcessado, LicencaUsoConfiguracao } from "../licenca-uso.types.js";

type RegistroLicencaUso = {
  instituicao_nome: string | null;
  instituicao_cnpj: string | null;
  plano_id: string;
  ciclo_cobranca: string;
  valor_base_mensal: Prisma.Decimal | number | string;
  percentual_desconto: Prisma.Decimal | number | string;
  valor_cobranca: Prisma.Decimal | number | string;
  valor_implantacao: Prisma.Decimal | number | string;
  implantacao_isenta: boolean;
  data_inicio_vigencia: Date | string | null;
  data_vencimento: Date | string | null;
  status_licenca: string;
  alertas_email_ativos: boolean;
  dias_alerta_email: unknown;
  emails_alerta: unknown;
  observacoes: string | null;
  pix_chave: string | null;
  pix_recebedor: string | null;
  pix_cidade: string | null;
  pix_ambiente: string;
  pix_webhook_url: string | null;
  pix_expiracao_minutos: number;
  pix_provider: string;
  cartao_provider: string;
  cartao_ambiente: string;
  cartao_chave_publica: string | null;
  cartao_chave_privada_ref: string | null;
  cartao_tentativas_falha: number;
  boleto_provider: string;
  boleto_ambiente: string;
  boleto_prazo_vencimento_dias: number;
  boleto_instrucao: string | null;
  mensagem_cobranca: string | null;
  checkout_handle: string | null;
  checkout_redirect_url: string | null;
  ultimo_checkout_url: string | null;
  ultimo_order_nsu: string | null;
  ultimo_invoice_slug: string | null;
  ultima_transaction_nsu: string | null;
  ultimo_receipt_url: string | null;
  ultimo_checkout_pago: boolean | null;
  ultimo_valor_pago: Prisma.Decimal | number | string | null;
};

const criarTabelaConfiguracaoSql = `
  CREATE TABLE IF NOT EXISTS licenca_uso_configuracoes (
    id BIGINT PRIMARY KEY,
    instituicao_nome VARCHAR(255),
    instituicao_cnpj VARCHAR(20),
    plano_id VARCHAR(30) NOT NULL,
    ciclo_cobranca VARCHAR(20) NOT NULL,
    valor_base_mensal NUMERIC(12,2) NOT NULL DEFAULT 247,
    percentual_desconto NUMERIC(6,2) NOT NULL DEFAULT 0,
    valor_cobranca NUMERIC(12,2) NOT NULL DEFAULT 247,
    valor_implantacao NUMERIC(12,2) NOT NULL DEFAULT 0,
    implantacao_isenta BOOLEAN NOT NULL DEFAULT FALSE,
    data_inicio_vigencia DATE,
    data_vencimento DATE,
    status_licenca VARCHAR(20) NOT NULL DEFAULT 'sem_vigencia',
    alertas_email_ativos BOOLEAN NOT NULL DEFAULT TRUE,
    dias_alerta_email JSONB NOT NULL DEFAULT '[30,15,7,1]',
    emails_alerta JSONB NOT NULL DEFAULT '[]',
    observacoes TEXT,
    pix_chave VARCHAR(140),
    pix_recebedor VARCHAR(140),
    pix_cidade VARCHAR(120),
    pix_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    pix_webhook_url TEXT,
    pix_expiracao_minutos INTEGER NOT NULL DEFAULT 1440,
    pix_provider VARCHAR(100) NOT NULL DEFAULT 'infinitypay',
    cartao_provider VARCHAR(100) NOT NULL DEFAULT 'infinitypay',
    cartao_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    cartao_chave_publica VARCHAR(255),
    cartao_chave_privada_ref VARCHAR(255),
    cartao_tentativas_falha INTEGER NOT NULL DEFAULT 2,
    boleto_provider VARCHAR(100) NOT NULL DEFAULT 'infinitypay',
    boleto_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    boleto_prazo_vencimento_dias INTEGER NOT NULL DEFAULT 5,
    boleto_instrucao TEXT,
    mensagem_cobranca TEXT,
    checkout_handle VARCHAR(120),
    checkout_redirect_url TEXT,
    ultimo_checkout_url TEXT,
    ultimo_order_nsu VARCHAR(120),
    ultimo_invoice_slug VARCHAR(120),
    ultima_transaction_nsu VARCHAR(120),
    ultimo_receipt_url TEXT,
    ultimo_checkout_pago BOOLEAN NOT NULL DEFAULT FALSE,
    ultimo_valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(120)
  );
`;

const alteracoesEstruturaSql = [
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS checkout_handle VARCHAR(120)",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS checkout_redirect_url TEXT",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_checkout_url TEXT",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_order_nsu VARCHAR(120)",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_invoice_slug VARCHAR(120)",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultima_transaction_nsu VARCHAR(120)",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_receipt_url TEXT",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_checkout_pago BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS ultimo_valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0"
];

const criarTabelaAlertasSql = `
  CREATE TABLE IF NOT EXISTS licenca_uso_alertas (
    id BIGSERIAL PRIMARY KEY,
    destinatario VARCHAR(255) NOT NULL,
    dias_antecedencia INTEGER NOT NULL,
    referencia_vencimento DATE NOT NULL,
    status_envio VARCHAR(20) NOT NULL,
    erro TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

let estruturaPromise: Promise<void> | null = null;

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value);
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function toNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0)
    .sort((a, b) => b - a);
}

function mapRow(row: RegistroLicencaUso): LicencaUsoConfiguracao {
  return {
    instituicaoNome: row.instituicao_nome ?? undefined,
    instituicaoCnpj: row.instituicao_cnpj ?? undefined,
    planoId: row.plano_id as LicencaUsoConfiguracao["planoId"],
    cicloCobranca: row.ciclo_cobranca as LicencaUsoConfiguracao["cicloCobranca"],
    valorBaseMensal: toNumber(row.valor_base_mensal),
    percentualDesconto: toNumber(row.percentual_desconto),
    valorCobranca: toNumber(row.valor_cobranca),
    valorImplantacao: toNumber(row.valor_implantacao),
    implantacaoIsenta: Boolean(row.implantacao_isenta),
    dataInicioVigencia: toIsoDate(row.data_inicio_vigencia),
    dataVencimento: toIsoDate(row.data_vencimento),
    statusLicenca: row.status_licenca as LicencaUsoConfiguracao["statusLicenca"],
    alertasEmailAtivos: Boolean(row.alertas_email_ativos),
    diasAlertaEmail: toNumberArray(row.dias_alerta_email),
    emailsAlerta: toStringArray(row.emails_alerta),
    observacoes: row.observacoes ?? undefined,
    pixChave: row.pix_chave ?? undefined,
    pixRecebedor: row.pix_recebedor ?? undefined,
    pixCidade: row.pix_cidade ?? undefined,
    pixAmbiente: row.pix_ambiente as "sandbox" | "producao",
    pixWebhookUrl: row.pix_webhook_url ?? undefined,
    pixExpiracaoMinutos: Number(row.pix_expiracao_minutos ?? 1440),
    pixProvider: row.pix_provider,
    cartaoProvider: row.cartao_provider,
    cartaoAmbiente: row.cartao_ambiente as "sandbox" | "producao",
    cartaoChavePublica: row.cartao_chave_publica ?? undefined,
    cartaoChavePrivadaRef: row.cartao_chave_privada_ref ?? undefined,
    cartaoTentativasFalha: Number(row.cartao_tentativas_falha ?? 2),
    boletoProvider: row.boleto_provider,
    boletoAmbiente: row.boleto_ambiente as "sandbox" | "producao",
    boletoPrazoVencimentoDias: Number(row.boleto_prazo_vencimento_dias ?? 5),
    boletoInstrucao: row.boleto_instrucao ?? undefined,
    mensagemCobranca: row.mensagem_cobranca ?? undefined,
    checkoutHandle: row.checkout_handle ?? undefined,
    checkoutRedirectUrl: row.checkout_redirect_url ?? undefined,
    ultimoCheckoutUrl: row.ultimo_checkout_url ?? undefined,
    ultimoOrderNsu: row.ultimo_order_nsu ?? undefined,
    ultimoInvoiceSlug: row.ultimo_invoice_slug ?? undefined,
    ultimaTransactionNsu: row.ultima_transaction_nsu ?? undefined,
    ultimoReceiptUrl: row.ultimo_receipt_url ?? undefined,
    ultimoCheckoutPago: Boolean(row.ultimo_checkout_pago),
    ultimoValorPago: toNumber(row.ultimo_valor_pago)
  };
}

export class LicencaUsoRepository {
  async buscarConfiguracao() {
    await ensureLicencaUsoEstrutura();
    const rows = await prisma.$queryRawUnsafe<RegistroLicencaUso[]>(`
      SELECT *
      FROM licenca_uso_configuracoes
      WHERE id = 1
      LIMIT 1
    `);
    if (!rows.length) return null;
    return mapRow(rows[0]);
  }

  async salvarConfiguracao(configuracao: LicencaUsoConfiguracao, usuarioAtualizacao: string) {
    await ensureLicencaUsoEstrutura();
    const rows = await prisma.$queryRawUnsafe<RegistroLicencaUso[]>(
      `
        INSERT INTO licenca_uso_configuracoes (
          id, instituicao_nome, instituicao_cnpj, plano_id, ciclo_cobranca, valor_base_mensal,
          percentual_desconto, valor_cobranca, valor_implantacao, implantacao_isenta,
          data_inicio_vigencia, data_vencimento, status_licenca, alertas_email_ativos,
          dias_alerta_email, emails_alerta, observacoes, pix_chave, pix_recebedor, pix_cidade,
          pix_ambiente, pix_webhook_url, pix_expiracao_minutos, pix_provider, cartao_provider,
          cartao_ambiente, cartao_chave_publica, cartao_chave_privada_ref, cartao_tentativas_falha,
          boleto_provider, boleto_ambiente, boleto_prazo_vencimento_dias, boleto_instrucao,
          mensagem_cobranca, checkout_handle, checkout_redirect_url, ultimo_checkout_url,
          ultimo_order_nsu, ultimo_invoice_slug, ultima_transaction_nsu, ultimo_receipt_url,
          ultimo_checkout_pago, ultimo_valor_pago, updated_at, updated_by
        )
        VALUES (
          1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, NOW(), $43
        )
        ON CONFLICT (id)
        DO UPDATE SET
          instituicao_nome = EXCLUDED.instituicao_nome,
          instituicao_cnpj = EXCLUDED.instituicao_cnpj,
          plano_id = EXCLUDED.plano_id,
          ciclo_cobranca = EXCLUDED.ciclo_cobranca,
          valor_base_mensal = EXCLUDED.valor_base_mensal,
          percentual_desconto = EXCLUDED.percentual_desconto,
          valor_cobranca = EXCLUDED.valor_cobranca,
          valor_implantacao = EXCLUDED.valor_implantacao,
          implantacao_isenta = EXCLUDED.implantacao_isenta,
          data_inicio_vigencia = EXCLUDED.data_inicio_vigencia,
          data_vencimento = EXCLUDED.data_vencimento,
          status_licenca = EXCLUDED.status_licenca,
          alertas_email_ativos = EXCLUDED.alertas_email_ativos,
          dias_alerta_email = EXCLUDED.dias_alerta_email,
          emails_alerta = EXCLUDED.emails_alerta,
          observacoes = EXCLUDED.observacoes,
          pix_chave = EXCLUDED.pix_chave,
          pix_recebedor = EXCLUDED.pix_recebedor,
          pix_cidade = EXCLUDED.pix_cidade,
          pix_ambiente = EXCLUDED.pix_ambiente,
          pix_webhook_url = EXCLUDED.pix_webhook_url,
          pix_expiracao_minutos = EXCLUDED.pix_expiracao_minutos,
          pix_provider = EXCLUDED.pix_provider,
          cartao_provider = EXCLUDED.cartao_provider,
          cartao_ambiente = EXCLUDED.cartao_ambiente,
          cartao_chave_publica = EXCLUDED.cartao_chave_publica,
          cartao_chave_privada_ref = EXCLUDED.cartao_chave_privada_ref,
          cartao_tentativas_falha = EXCLUDED.cartao_tentativas_falha,
          boleto_provider = EXCLUDED.boleto_provider,
          boleto_ambiente = EXCLUDED.boleto_ambiente,
          boleto_prazo_vencimento_dias = EXCLUDED.boleto_prazo_vencimento_dias,
          boleto_instrucao = EXCLUDED.boleto_instrucao,
          mensagem_cobranca = EXCLUDED.mensagem_cobranca,
          checkout_handle = EXCLUDED.checkout_handle,
          checkout_redirect_url = EXCLUDED.checkout_redirect_url,
          ultimo_checkout_url = EXCLUDED.ultimo_checkout_url,
          ultimo_order_nsu = EXCLUDED.ultimo_order_nsu,
          ultimo_invoice_slug = EXCLUDED.ultimo_invoice_slug,
          ultima_transaction_nsu = EXCLUDED.ultima_transaction_nsu,
          ultimo_receipt_url = EXCLUDED.ultimo_receipt_url,
          ultimo_checkout_pago = EXCLUDED.ultimo_checkout_pago,
          ultimo_valor_pago = EXCLUDED.ultimo_valor_pago,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `,
      configuracao.instituicaoNome ?? null,
      configuracao.instituicaoCnpj ?? null,
      configuracao.planoId,
      configuracao.cicloCobranca,
      configuracao.valorBaseMensal,
      configuracao.percentualDesconto,
      configuracao.valorCobranca,
      configuracao.valorImplantacao,
      configuracao.implantacaoIsenta,
      configuracao.dataInicioVigencia ?? null,
      configuracao.dataVencimento ?? null,
      configuracao.statusLicenca,
      configuracao.alertasEmailAtivos,
      JSON.stringify(configuracao.diasAlertaEmail),
      JSON.stringify(configuracao.emailsAlerta),
      configuracao.observacoes ?? null,
      configuracao.pixChave ?? null,
      configuracao.pixRecebedor ?? null,
      configuracao.pixCidade ?? null,
      configuracao.pixAmbiente,
      configuracao.pixWebhookUrl ?? null,
      configuracao.pixExpiracaoMinutos,
      configuracao.pixProvider,
      configuracao.cartaoProvider,
      configuracao.cartaoAmbiente,
      configuracao.cartaoChavePublica ?? null,
      configuracao.cartaoChavePrivadaRef ?? null,
      configuracao.cartaoTentativasFalha,
      configuracao.boletoProvider,
      configuracao.boletoAmbiente,
      configuracao.boletoPrazoVencimentoDias,
      configuracao.boletoInstrucao ?? null,
      configuracao.mensagemCobranca ?? null,
      configuracao.checkoutHandle ?? null,
      configuracao.checkoutRedirectUrl ?? null,
      configuracao.ultimoCheckoutUrl ?? null,
      configuracao.ultimoOrderNsu ?? null,
      configuracao.ultimoInvoiceSlug ?? null,
      configuracao.ultimaTransactionNsu ?? null,
      configuracao.ultimoReceiptUrl ?? null,
      Boolean(configuracao.ultimoCheckoutPago),
      configuracao.ultimoValorPago ?? 0,
      usuarioAtualizacao
    );
    return mapRow(rows[0]);
  }

  async alertaJaEnviado(destinatario: string, diasAntecedencia: number, referenciaVencimento: string) {
    await ensureLicencaUsoEstrutura();
    const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      `
        SELECT COUNT(*)::bigint AS total
        FROM licenca_uso_alertas
        WHERE destinatario = $1
          AND dias_antecedencia = $2
          AND referencia_vencimento = $3::date
          AND status_envio = 'enviado'
      `,
      destinatario,
      diasAntecedencia,
      referenciaVencimento
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async registrarAlerta(processado: LicencaUsoAlertaProcessado) {
    await ensureLicencaUsoEstrutura();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO licenca_uso_alertas (
          destinatario,
          dias_antecedencia,
          referencia_vencimento,
          status_envio,
          erro
        )
        VALUES ($1, $2, $3::date, $4, $5)
      `,
      processado.destinatario,
      processado.diasAntecedencia,
      processado.referenciaVencimento,
      processado.statusEnvio,
      processado.erro ?? null
    );
  }
}

export async function ensureLicencaUsoEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = Promise.all([
      prisma.$executeRawUnsafe(criarTabelaConfiguracaoSql),
      prisma.$executeRawUnsafe(criarTabelaAlertasSql)
    ]).then(() => undefined);
  }
  await estruturaPromise;
  for (const sql of alteracoesEstruturaSql) {
    await prisma.$executeRawUnsafe(sql);
  }
}
