import { prisma } from "../../../database/prisma.js";
const criarTabelaConfiguracaoSql = `
  CREATE TABLE IF NOT EXISTS licenca_uso_configuracoes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID UNIQUE,
    instituicao_nome VARCHAR(255),
    instituicao_cnpj VARCHAR(20),
    plano_id VARCHAR(30) NOT NULL,
    ciclo_cobranca VARCHAR(20) NOT NULL,
    vigencia_inicial_dias INTEGER,
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
    "CREATE SEQUENCE IF NOT EXISTS licenca_uso_configuracoes_id_seq",
    "ALTER TABLE licenca_uso_configuracoes ALTER COLUMN id SET DEFAULT nextval('licenca_uso_configuracoes_id_seq')",
    "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE licenca_uso_configuracoes ADD COLUMN IF NOT EXISTS vigencia_inicial_dias INTEGER",
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
const criarTabelaPagamentosSql = `
  CREATE TABLE IF NOT EXISTS licenca_uso_pagamentos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    status VARCHAR(20) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    plano_id VARCHAR(30) NOT NULL,
    ciclo_cobranca VARCHAR(20) NOT NULL,
    vigencia_inicio DATE,
    vigencia_fim DATE,
    vigencia_dias INTEGER,
    valor_licenca NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_implantacao NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    order_nsu VARCHAR(120),
    invoice_slug VARCHAR(120),
    transaction_nsu VARCHAR(120),
    checkout_url TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP
  );
`;
const criarTabelaAlertasSql = `
  CREATE TABLE IF NOT EXISTS licenca_uso_alertas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    destinatario VARCHAR(255) NOT NULL,
    dias_antecedencia INTEGER NOT NULL,
    referencia_vencimento DATE NOT NULL,
    status_envio VARCHAR(20) NOT NULL,
    erro TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;
let estruturaPromise = null;
function toIsoDate(value) {
    if (!value)
        return undefined;
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
}
function toNumber(value) {
    if (value == null)
        return 0;
    return Number(value);
}
function toStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}
function toNumberArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 0)
        .sort((a, b) => b - a);
}
function mapRow(row) {
    return {
        instituicaoNome: row.instituicao_nome ?? undefined,
        instituicaoCnpj: row.instituicao_cnpj ?? undefined,
        planoId: row.plano_id,
        cicloCobranca: row.ciclo_cobranca,
        vigenciaInicialDias: row.vigencia_inicial_dias ?? undefined,
        valorBaseMensal: toNumber(row.valor_base_mensal),
        percentualDesconto: toNumber(row.percentual_desconto),
        valorCobranca: toNumber(row.valor_cobranca),
        valorImplantacao: toNumber(row.valor_implantacao),
        implantacaoIsenta: Boolean(row.implantacao_isenta),
        dataInicioVigencia: toIsoDate(row.data_inicio_vigencia),
        dataVencimento: toIsoDate(row.data_vencimento),
        statusLicenca: row.status_licenca,
        alertasEmailAtivos: Boolean(row.alertas_email_ativos),
        diasAlertaEmail: toNumberArray(row.dias_alerta_email),
        emailsAlerta: toStringArray(row.emails_alerta),
        observacoes: row.observacoes ?? undefined,
        pixChave: row.pix_chave ?? undefined,
        pixRecebedor: row.pix_recebedor ?? undefined,
        pixCidade: row.pix_cidade ?? undefined,
        pixAmbiente: row.pix_ambiente,
        pixWebhookUrl: row.pix_webhook_url ?? undefined,
        pixExpiracaoMinutos: Number(row.pix_expiracao_minutos ?? 1440),
        pixProvider: row.pix_provider,
        cartaoProvider: row.cartao_provider,
        cartaoAmbiente: row.cartao_ambiente,
        cartaoChavePublica: row.cartao_chave_publica ?? undefined,
        cartaoChavePrivadaRef: row.cartao_chave_privada_ref ?? undefined,
        cartaoTentativasFalha: Number(row.cartao_tentativas_falha ?? 2),
        boletoProvider: row.boleto_provider,
        boletoAmbiente: row.boleto_ambiente,
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
function mapPagamentoRow(row) {
    return {
        id: Number(row.id),
        status: row.status,
        descricao: row.descricao,
        planoId: row.plano_id,
        cicloCobranca: row.ciclo_cobranca,
        vigenciaInicio: toIsoDate(row.vigencia_inicio),
        vigenciaFim: toIsoDate(row.vigencia_fim),
        vigenciaDias: row.vigencia_dias ?? undefined,
        valorLicenca: toNumber(row.valor_licenca),
        valorImplantacao: toNumber(row.valor_implantacao),
        valorTotal: toNumber(row.valor_total),
        orderNsu: row.order_nsu ?? undefined,
        invoiceSlug: row.invoice_slug ?? undefined,
        transactionNsu: row.transaction_nsu ?? undefined,
        checkoutUrl: row.checkout_url ?? undefined,
        receiptUrl: row.receipt_url ?? undefined,
        criadoEm: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        pagoEm: row.paid_at ? new Date(row.paid_at).toISOString() : undefined
    };
}
export class LicencaUsoRepository {
    async listarTenantsComConfiguracao() {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT tenant_id::text AS tenant_id
      FROM licenca_uso_configuracoes
      WHERE tenant_id IS NOT NULL
      ORDER BY updated_at DESC, id DESC
    `);
        return rows.map((item) => String(item.tenant_id ?? "").trim()).filter(Boolean);
    }
    async buscarConfiguracao(tenantId) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM licenca_uso_configuracoes
      WHERE tenant_id::text = $1
      LIMIT 1
    `, tenantId);
        if (!rows.length)
            return null;
        return mapRow(rows[0]);
    }
    async salvarConfiguracao(configuracao, usuarioAtualizacao, tenantId) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO licenca_uso_configuracoes (
          tenant_id, instituicao_nome, instituicao_cnpj, plano_id, ciclo_cobranca, vigencia_inicial_dias, valor_base_mensal,
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
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13::date, $14, $15, $16::jsonb, $17::jsonb,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
          $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, NOW(), $45
        )
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          instituicao_nome = EXCLUDED.instituicao_nome,
          instituicao_cnpj = EXCLUDED.instituicao_cnpj,
          plano_id = EXCLUDED.plano_id,
          ciclo_cobranca = EXCLUDED.ciclo_cobranca,
          vigencia_inicial_dias = EXCLUDED.vigencia_inicial_dias,
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
      `, tenantId, configuracao.instituicaoNome ?? null, configuracao.instituicaoCnpj ?? null, configuracao.planoId, configuracao.cicloCobranca, configuracao.vigenciaInicialDias ?? null, configuracao.valorBaseMensal, configuracao.percentualDesconto, configuracao.valorCobranca, configuracao.valorImplantacao, configuracao.implantacaoIsenta, configuracao.dataInicioVigencia ?? null, configuracao.dataVencimento ?? null, configuracao.statusLicenca, configuracao.alertasEmailAtivos, JSON.stringify(configuracao.diasAlertaEmail), JSON.stringify(configuracao.emailsAlerta), configuracao.observacoes ?? null, configuracao.pixChave ?? null, configuracao.pixRecebedor ?? null, configuracao.pixCidade ?? null, configuracao.pixAmbiente, configuracao.pixWebhookUrl ?? null, configuracao.pixExpiracaoMinutos, configuracao.pixProvider, configuracao.cartaoProvider, configuracao.cartaoAmbiente, configuracao.cartaoChavePublica ?? null, configuracao.cartaoChavePrivadaRef ?? null, configuracao.cartaoTentativasFalha, configuracao.boletoProvider, configuracao.boletoAmbiente, configuracao.boletoPrazoVencimentoDias, configuracao.boletoInstrucao ?? null, configuracao.mensagemCobranca ?? null, configuracao.checkoutHandle ?? null, configuracao.checkoutRedirectUrl ?? null, configuracao.ultimoCheckoutUrl ?? null, configuracao.ultimoOrderNsu ?? null, configuracao.ultimoInvoiceSlug ?? null, configuracao.ultimaTransactionNsu ?? null, configuracao.ultimoReceiptUrl ?? null, Boolean(configuracao.ultimoCheckoutPago), configuracao.ultimoValorPago ?? 0, usuarioAtualizacao);
        return mapRow(rows[0]);
    }
    async listarPagamentos(tenantId) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM licenca_uso_pagamentos
      WHERE tenant_id::text = $1
      ORDER BY created_at DESC, id DESC
    `, tenantId);
        return rows.map(mapPagamentoRow);
    }
    async registrarPagamentoPendente(input) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO licenca_uso_pagamentos (
          tenant_id, status, descricao, plano_id, ciclo_cobranca, vigencia_inicio, vigencia_fim, vigencia_dias,
          valor_licenca, valor_implantacao, valor_total, order_nsu, invoice_slug, checkout_url
        )
        VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, input.tenantId, "pendente", input.descricao, input.planoId, input.cicloCobranca, input.vigenciaInicio ?? null, input.vigenciaFim ?? null, input.vigenciaDias ?? null, input.valorLicenca, input.valorImplantacao, input.valorTotal, input.orderNsu ?? null, input.invoiceSlug ?? null, input.checkoutUrl ?? null);
        return mapPagamentoRow(rows[0]);
    }
    async buscarPagamentoPorOrderNsu(orderNsu) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        SELECT *
        FROM licenca_uso_pagamentos
        WHERE order_nsu = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `, orderNsu);
        return rows[0] ?? null;
    }
    async marcarPagamentoComoPago(input) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        UPDATE licenca_uso_pagamentos
        SET
          status = 'pago',
          invoice_slug = COALESCE($2, invoice_slug),
          transaction_nsu = COALESCE($3, transaction_nsu),
          receipt_url = COALESCE($4, receipt_url),
          valor_total = COALESCE($5, valor_total),
          vigencia_inicio = COALESCE($6::date, vigencia_inicio),
          vigencia_fim = COALESCE($7::date, vigencia_fim),
          vigencia_dias = COALESCE($8, vigencia_dias),
          paid_at = NOW()
        WHERE order_nsu = $1
          AND tenant_id::text = $9
        RETURNING *
      `, input.orderNsu, input.invoiceSlug ?? null, input.transactionNsu ?? null, input.receiptUrl ?? null, input.valorTotal ?? null, input.vigenciaInicio ?? null, input.vigenciaFim ?? null, input.vigenciaDias ?? null, input.tenantId);
        return rows[0] ? mapPagamentoRow(rows[0]) : null;
    }
    async alertaJaEnviado(tenantId, destinatario, diasAntecedencia, referenciaVencimento) {
        await ensureLicencaUsoEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::bigint AS total
        FROM licenca_uso_alertas
        WHERE tenant_id::text = $1
          AND destinatario = $2
          AND dias_antecedencia = $3
          AND referencia_vencimento = $4::date
          AND status_envio = 'enviado'
      `, tenantId, destinatario, diasAntecedencia, referenciaVencimento);
        return Number(rows[0]?.total ?? 0) > 0;
    }
    async registrarAlerta(tenantId, processado) {
        await ensureLicencaUsoEstrutura();
        await prisma.$executeRawUnsafe(`
        INSERT INTO licenca_uso_alertas (
          tenant_id,
          destinatario,
          dias_antecedencia,
          referencia_vencimento,
          status_envio,
          erro
        )
        VALUES ($1::uuid, $2, $3, $4::date, $5, $6)
      `, tenantId, processado.destinatario, processado.diasAntecedencia, processado.referenciaVencimento, processado.statusEnvio, processado.erro ?? null);
    }
}
export async function ensureLicencaUsoEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = Promise.all([
            prisma.$executeRawUnsafe(criarTabelaConfiguracaoSql),
            prisma.$executeRawUnsafe(criarTabelaAlertasSql),
            prisma.$executeRawUnsafe(criarTabelaPagamentosSql)
        ]).then(() => undefined);
    }
    await estruturaPromise;
    for (const sql of alteracoesEstruturaSql) {
        await prisma.$executeRawUnsafe(sql);
    }
    await prisma.$executeRawUnsafe("ALTER TABLE licenca_uso_pagamentos ADD COLUMN IF NOT EXISTS tenant_id UUID");
    await prisma.$executeRawUnsafe("ALTER TABLE licenca_uso_alertas ADD COLUMN IF NOT EXISTS tenant_id UUID");
    await prisma.$executeRawUnsafe("CREATE UNIQUE INDEX IF NOT EXISTS licenca_uso_configuracoes_tenant_uidx ON licenca_uso_configuracoes(tenant_id)");
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS licenca_uso_pagamentos_tenant_idx ON licenca_uso_pagamentos(tenant_id, created_at DESC)");
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS licenca_uso_alertas_tenant_idx ON licenca_uso_alertas(tenant_id, referencia_vencimento DESC)");
    await prisma.$executeRawUnsafe(`
    UPDATE licenca_uso_configuracoes
    SET tenant_id = origem.tenant_id
    FROM (
      SELECT tenant_id
      FROM unidade_assistencial
      WHERE tenant_id IS NOT NULL
      ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
      LIMIT 1
    ) origem
    WHERE licenca_uso_configuracoes.tenant_id IS NULL
  `);
    await prisma.$executeRawUnsafe(`
    UPDATE licenca_uso_pagamentos
    SET tenant_id = configuracao.tenant_id
    FROM (
      SELECT tenant_id
      FROM licenca_uso_configuracoes
      WHERE tenant_id IS NOT NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) configuracao
    WHERE licenca_uso_pagamentos.tenant_id IS NULL
  `);
    await prisma.$executeRawUnsafe(`
    UPDATE licenca_uso_alertas
    SET tenant_id = configuracao.tenant_id
    FROM (
      SELECT tenant_id
      FROM licenca_uso_configuracoes
      WHERE tenant_id IS NOT NULL
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    ) configuracao
    WHERE licenca_uso_alertas.tenant_id IS NULL
  `);
}
