import { randomUUID } from "node:crypto";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { captacaoPermissions } from "../captacao-recursos.types.js";
const sqlEstrutura = [
    `
    CREATE TABLE IF NOT EXISTS captacao_doadores (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      tipo_doador VARCHAR(30) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      nome_fantasia VARCHAR(255),
      cpf_cnpj VARCHAR(20),
      cpf_cnpj_norm VARCHAR(20),
      data_nascimento_fundacao DATE,
      email_principal VARCHAR(255),
      email_principal_norm VARCHAR(255),
      email_secundario VARCHAR(255),
      email_secundario_norm VARCHAR(255),
      telefone VARCHAR(30),
      telefone_norm VARCHAR(20),
      whatsapp VARCHAR(30),
      whatsapp_norm VARCHAR(25),
      endereco_completo VARCHAR(255),
      bairro VARCHAR(120),
      cidade VARCHAR(120),
      uf CHAR(2),
      cep VARCHAR(12),
      cep_norm VARCHAR(8),
      observacoes TEXT,
      origem_cadastro VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'ativo',
      aceitou_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
      data_aceite_lgpd DATE,
      aceita_email BOOLEAN NOT NULL DEFAULT TRUE,
      aceita_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
      aceita_receber_campanhas BOOLEAN NOT NULL DEFAULT TRUE,
      categoria_doador VARCHAR(40),
      segmento_relacionamento VARCHAR(60),
      status_retencao VARCHAR(30),
      motivo_risco VARCHAR(255),
      proxima_acao_sugerida VARCHAR(255),
      score_relacionamento INTEGER NOT NULL DEFAULT 0,
      responsavel_relacionamento VARCHAR(120),
      observacoes_internas TEXT,
      portal_ativo BOOLEAN NOT NULL DEFAULT TRUE,
      anexo_principal_caminho TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_doadores_contatos (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doador_id BIGINT NOT NULL REFERENCES captacao_doadores(id) ON DELETE CASCADE,
      tipo_contato VARCHAR(30) NOT NULL,
      valor VARCHAR(255) NOT NULL,
      valor_norm VARCHAR(255),
      principal BOOLEAN NOT NULL DEFAULT FALSE,
      observacao VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_tarefas_relacionamento (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doador_id BIGINT NOT NULL REFERENCES captacao_doadores(id) ON DELETE CASCADE,
      titulo VARCHAR(160) NOT NULL,
      descricao TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pendente',
      prioridade VARCHAR(20) NOT NULL DEFAULT 'media',
      tipo VARCHAR(40) NOT NULL DEFAULT 'follow_up',
      responsavel VARCHAR(120),
      data_prevista DATE,
      concluida_em TIMESTAMP,
      origem VARCHAR(40) NOT NULL DEFAULT 'manual',
      tenant_id UUID,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_campanhas (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      nome VARCHAR(255) NOT NULL,
      descricao_curta VARCHAR(255),
      descricao_completa TEXT,
      objetivo VARCHAR(255),
      meta_financeira NUMERIC(14,2) NOT NULL DEFAULT 0,
      valor_arrecadado NUMERIC(14,2) NOT NULL DEFAULT 0,
      percentual_atingido NUMERIC(7,2) NOT NULL DEFAULT 0,
      data_inicial DATE,
      data_final DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
      imagem_banner TEXT,
      cor_destaque VARCHAR(20),
      tipo VARCHAR(40) NOT NULL,
      responsavel VARCHAR(120),
      destaque_no_portal BOOLEAN NOT NULL DEFAULT FALSE,
      visivel_ao_publico BOOLEAN NOT NULL DEFAULT FALSE,
      url_publica TEXT,
      qr_code_publico TEXT,
      mensagem_agradecimento TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_campanhas_metricas (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      campanha_id BIGINT NOT NULL UNIQUE REFERENCES captacao_campanhas(id) ON DELETE CASCADE,
      total_arrecadado NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_doacoes INTEGER NOT NULL DEFAULT 0,
      total_doadores INTEGER NOT NULL DEFAULT 0,
      percentual_atingido NUMERIC(7,2) NOT NULL DEFAULT 0,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_recorrencias (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doador_id BIGINT REFERENCES captacao_doadores(id),
      campanha_id BIGINT REFERENCES captacao_campanhas(id),
      valor_recorrente NUMERIC(14,2) NOT NULL,
      periodicidade VARCHAR(20) NOT NULL,
      forma_pagamento VARCHAR(20) NOT NULL,
      data_proxima_cobranca DATE,
      quantidade_ciclos INTEGER,
      ciclos_pagos INTEGER NOT NULL DEFAULT 0,
      sem_previsao_termino BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'ativa',
      referencia_externa VARCHAR(120),
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_doacoes (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      numero_doacao VARCHAR(40) NOT NULL UNIQUE,
      data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
      doador_id BIGINT REFERENCES captacao_doadores(id),
      campanha_id BIGINT REFERENCES captacao_campanhas(id),
      recorrencia_id BIGINT REFERENCES captacao_recorrencias(id),
      valor NUMERIC(14,2) NOT NULL,
      valor_liquido NUMERIC(14,2) NOT NULL DEFAULT 0,
      valor_taxas NUMERIC(14,2) NOT NULL DEFAULT 0,
      tipo_doacao VARCHAR(30) NOT NULL,
      forma_pagamento VARCHAR(20) NOT NULL,
      situacao VARCHAR(30) NOT NULL DEFAULT 'pendente',
      origem VARCHAR(30) NOT NULL DEFAULT 'administrativo',
      identificador_externo VARCHAR(120),
      txid VARCHAR(120),
      link_pagamento TEXT,
      data_vencimento DATE,
      observacoes_internas TEXT,
      usuario_responsavel VARCHAR(120),
      comprovante_gerado BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_doacoes_eventos (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doacao_id BIGINT NOT NULL REFERENCES captacao_doacoes(id) ON DELETE CASCADE,
      tipo_evento VARCHAR(60) NOT NULL,
      descricao VARCHAR(255),
      payload_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_transacoes_pix (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doacao_id BIGINT NOT NULL UNIQUE REFERENCES captacao_doacoes(id) ON DELETE CASCADE,
      txid VARCHAR(120),
      payload_pix TEXT,
      qr_code_svg TEXT,
      status VARCHAR(30) NOT NULL,
      data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
      data_expiracao TIMESTAMP,
      data_liquidacao TIMESTAMP,
      provider_nome VARCHAR(100),
      payload_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_transacoes_cartao (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doacao_id BIGINT NOT NULL UNIQUE REFERENCES captacao_doacoes(id) ON DELETE CASCADE,
      referencia_externa VARCHAR(120),
      autorizacao_codigo VARCHAR(120),
      captura_codigo VARCHAR(120),
      status VARCHAR(30) NOT NULL,
      provider_nome VARCHAR(100),
      payload_json JSONB,
      historico_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_transacoes_boleto (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doacao_id BIGINT NOT NULL UNIQUE REFERENCES captacao_doacoes(id) ON DELETE CASCADE,
      numero_documento VARCHAR(120),
      nosso_numero VARCHAR(120),
      linha_digitavel VARCHAR(255),
      codigo_barras VARCHAR(255),
      data_emissao DATE,
      data_vencimento DATE,
      data_pagamento DATE,
      status VARCHAR(30) NOT NULL,
      provider_nome VARCHAR(100),
      retorno_processamento TEXT,
      payload_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_comprovantes (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doacao_id BIGINT NOT NULL UNIQUE REFERENCES captacao_doacoes(id) ON DELETE CASCADE,
      doador_id BIGINT REFERENCES captacao_doadores(id),
      campanha_id BIGINT REFERENCES captacao_campanhas(id),
      numero_comprovante VARCHAR(60) NOT NULL UNIQUE,
      codigo_validacao VARCHAR(80) NOT NULL,
      arquivo_caminho TEXT,
      enviado_email BOOLEAN NOT NULL DEFAULT FALSE,
      data_envio_email TIMESTAMP,
      mensagem_agradecimento TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_configuracoes (
      id BIGSERIAL PRIMARY KEY,
      modulo_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
      portal_doador_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
      campanhas_publicas_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
      doacoes_recorrentes_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
      envio_automatico_comprovantes BOOLEAN NOT NULL DEFAULT TRUE,
      pix_chave VARCHAR(120),
      pix_recebedor VARCHAR(120),
      pix_cidade VARCHAR(120),
      pix_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
      pix_webhook_url TEXT,
      pix_expiracao_minutos INTEGER NOT NULL DEFAULT 1440,
      pix_provider VARCHAR(100) NOT NULL DEFAULT 'mock-g3n',
      cartao_provider VARCHAR(100) NOT NULL DEFAULT 'mock-g3n',
      cartao_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
      cartao_chave_publica VARCHAR(255),
      cartao_chave_privada_ref VARCHAR(255),
      cartao_tentativas_falha INTEGER NOT NULL DEFAULT 2,
      boleto_provider VARCHAR(100) NOT NULL DEFAULT 'mock-g3n',
      boleto_ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox',
      boleto_prazo_vencimento_dias INTEGER NOT NULL DEFAULT 5,
      boleto_instrucao TEXT,
      mensagem_agradecimento TEXT,
      modelo_comprovante TEXT,
      modelo_email_cobranca TEXT,
      modelo_lembrete TEXT,
      modelo_campanha TEXT,
      lgpd_termo_consentimento TEXT,
      lgpd_politica_privacidade TEXT,
      lgpd_base_legal TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_logs (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      entidade_tipo VARCHAR(60) NOT NULL,
      entidade_id BIGINT,
      acao VARCHAR(80) NOT NULL,
      descricao VARCHAR(255),
      detalhes_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_preferencias_comunicacao (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doador_id BIGINT NOT NULL UNIQUE REFERENCES captacao_doadores(id) ON DELETE CASCADE,
      aceita_email BOOLEAN NOT NULL DEFAULT TRUE,
      aceita_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
      aceita_campanhas BOOLEAN NOT NULL DEFAULT TRUE,
      aceite_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
      data_aceite_lgpd DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `
    CREATE TABLE IF NOT EXISTS captacao_portal_acessos (
      id BIGSERIAL PRIMARY KEY,
      uuid VARCHAR(40) NOT NULL UNIQUE,
      instituicao_id BIGINT,
      doador_id BIGINT NOT NULL REFERENCES captacao_doadores(id) ON DELETE CASCADE,
      token_acesso VARCHAR(120) NOT NULL UNIQUE,
      email_utilizado VARCHAR(255),
      ip_origem VARCHAR(100),
      user_agent TEXT,
      ultimo_acesso_em TIMESTAMP NOT NULL DEFAULT NOW(),
      expira_em TIMESTAMP NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    );
  `,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_doadores_contatos ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_campanhas ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_campanhas_metricas ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_recorrencias ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_doacoes ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_doacoes_eventos ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_transacoes_pix ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_transacoes_cartao ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_transacoes_boleto ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_comprovantes ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_preferencias_comunicacao ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_portal_acessos ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS segmento_relacionamento VARCHAR(60);`,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS status_retencao VARCHAR(30);`,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS motivo_risco VARCHAR(255);`,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS proxima_acao_sugerida VARCHAR(255);`,
    `ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS score_relacionamento INTEGER NOT NULL DEFAULT 0;`,
    `CREATE INDEX IF NOT EXISTS captacao_doadores_status_idx ON captacao_doadores (status) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doadores_nome_idx ON captacao_doadores (nome);`,
    `CREATE INDEX IF NOT EXISTS captacao_tarefas_relacionamento_doador_idx ON captacao_tarefas_relacionamento (doador_id);`,
    `CREATE INDEX IF NOT EXISTS captacao_tarefas_relacionamento_status_idx ON captacao_tarefas_relacionamento (status);`,
    `CREATE INDEX IF NOT EXISTS captacao_tarefas_relacionamento_tenant_idx ON captacao_tarefas_relacionamento (tenant_id, status, data_prevista DESC);`,
    `DROP INDEX IF EXISTS captacao_doadores_documento_unique_idx;`,
    `DROP INDEX IF EXISTS captacao_doadores_email_unique_idx;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS captacao_doadores_documento_unique_idx ON captacao_doadores (tenant_id, cpf_cnpj_norm) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL AND cpf_cnpj_norm IS NOT NULL;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS captacao_doadores_email_unique_idx ON captacao_doadores (tenant_id, email_principal_norm) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL AND email_principal_norm IS NOT NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_campanhas_status_idx ON captacao_campanhas (status) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doacoes_data_idx ON captacao_doacoes (data_hora) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doacoes_situacao_idx ON captacao_doacoes (situacao) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doacoes_campanha_idx ON captacao_doacoes (campanha_id) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doacoes_doador_idx ON captacao_doacoes (doador_id) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_logs_entidade_idx ON captacao_logs (entidade_tipo, entidade_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS captacao_doadores_tenant_idx ON captacao_doadores (tenant_id) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_campanhas_tenant_idx ON captacao_campanhas (tenant_id) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_doacoes_tenant_idx ON captacao_doacoes (tenant_id) WHERE deleted_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS captacao_comprovantes_tenant_idx ON captacao_comprovantes (tenant_id);`,
    `CREATE INDEX IF NOT EXISTS captacao_logs_tenant_idx ON captacao_logs (tenant_id, created_at DESC);`,
    `
    UPDATE captacao_doadores
       SET tenant_id = origem.tenant_id
      FROM (
        SELECT tenant_id
        FROM unidade_assistencial
        WHERE tenant_id IS NOT NULL
        ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
        LIMIT 1
      ) origem
     WHERE captacao_doadores.tenant_id IS NULL;
  `,
    `
    UPDATE captacao_doadores_contatos
       SET tenant_id = d.tenant_id
      FROM captacao_doadores d
     WHERE captacao_doadores_contatos.tenant_id IS NULL
       AND d.id = captacao_doadores_contatos.doador_id;
  `,
    `
    UPDATE captacao_campanhas
       SET tenant_id = origem.tenant_id
      FROM (
        SELECT tenant_id
        FROM unidade_assistencial
        WHERE tenant_id IS NOT NULL
        ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
        LIMIT 1
      ) origem
     WHERE captacao_campanhas.tenant_id IS NULL;
  `,
    `
    UPDATE captacao_campanhas_metricas
       SET tenant_id = c.tenant_id
      FROM captacao_campanhas c
     WHERE captacao_campanhas_metricas.tenant_id IS NULL
       AND c.id = captacao_campanhas_metricas.campanha_id;
  `,
    `
    UPDATE captacao_recorrencias
       SET tenant_id = COALESCE(
         (
           SELECT d.tenant_id
             FROM captacao_doadores d
            WHERE d.id = captacao_recorrencias.doador_id
            LIMIT 1
         ),
         (
           SELECT c.tenant_id
             FROM captacao_campanhas c
            WHERE c.id = captacao_recorrencias.campanha_id
            LIMIT 1
         )
       )
     WHERE captacao_recorrencias.tenant_id IS NULL
       AND EXISTS (
         SELECT 1
           FROM captacao_doadores d
          WHERE d.id = captacao_recorrencias.doador_id
       );
  `,
    `
    UPDATE captacao_doacoes
       SET tenant_id = COALESCE(
         (
           SELECT d.tenant_id
             FROM captacao_doadores d
            WHERE d.id = captacao_doacoes.doador_id
            LIMIT 1
         ),
         (
           SELECT c.tenant_id
             FROM captacao_campanhas c
            WHERE c.id = captacao_doacoes.campanha_id
            LIMIT 1
         ),
         (
           SELECT r.tenant_id
             FROM captacao_recorrencias r
            WHERE r.id = captacao_doacoes.recorrencia_id
            LIMIT 1
         )
       )
     WHERE captacao_doacoes.tenant_id IS NULL
       AND EXISTS (
         SELECT 1
           FROM captacao_doadores d
          WHERE d.id = captacao_doacoes.doador_id
       );
  `,
    `
    UPDATE captacao_doacoes_eventos
       SET tenant_id = d.tenant_id
      FROM captacao_doacoes d
     WHERE captacao_doacoes_eventos.tenant_id IS NULL
       AND d.id = captacao_doacoes_eventos.doacao_id;
  `,
    `
    UPDATE captacao_transacoes_pix
       SET tenant_id = d.tenant_id
      FROM captacao_doacoes d
     WHERE captacao_transacoes_pix.tenant_id IS NULL
       AND d.id = captacao_transacoes_pix.doacao_id;
  `,
    `
    UPDATE captacao_transacoes_cartao
       SET tenant_id = d.tenant_id
      FROM captacao_doacoes d
     WHERE captacao_transacoes_cartao.tenant_id IS NULL
       AND d.id = captacao_transacoes_cartao.doacao_id;
  `,
    `
    UPDATE captacao_transacoes_boleto
       SET tenant_id = d.tenant_id
      FROM captacao_doacoes d
     WHERE captacao_transacoes_boleto.tenant_id IS NULL
       AND d.id = captacao_transacoes_boleto.doacao_id;
  `,
    `
    UPDATE captacao_comprovantes
       SET tenant_id = d.tenant_id
      FROM captacao_doacoes d
     WHERE captacao_comprovantes.tenant_id IS NULL
       AND d.id = captacao_comprovantes.doacao_id;
  `,
    `
    UPDATE captacao_logs
       SET tenant_id = origem.tenant_id
      FROM (
        SELECT tenant_id
        FROM unidade_assistencial
        WHERE tenant_id IS NOT NULL
        ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
        LIMIT 1
      ) origem
     WHERE captacao_logs.tenant_id IS NULL;
  `,
    `
    UPDATE captacao_preferencias_comunicacao
       SET tenant_id = d.tenant_id
      FROM captacao_doadores d
     WHERE captacao_preferencias_comunicacao.tenant_id IS NULL
       AND d.id = captacao_preferencias_comunicacao.doador_id;
  `,
    `
    UPDATE captacao_portal_acessos
       SET tenant_id = d.tenant_id
      FROM captacao_doadores d
     WHERE captacao_portal_acessos.tenant_id IS NULL
       AND d.id = captacao_portal_acessos.doador_id;
  `,
    `
    UPDATE captacao_tarefas_relacionamento
       SET tenant_id = d.tenant_id
      FROM captacao_doadores d
     WHERE captacao_tarefas_relacionamento.tenant_id IS NULL
       AND d.id = captacao_tarefas_relacionamento.doador_id;
  `,
    `
    INSERT INTO captacao_configuracoes (
      tenant_id,
      modulo_habilitado,
      portal_doador_habilitado,
      campanhas_publicas_habilitadas,
      doacoes_recorrentes_habilitadas,
      envio_automatico_comprovantes
    )
    SELECT DISTINCT ua.tenant_id, TRUE, TRUE, TRUE, TRUE, TRUE
    FROM unidade_assistencial ua
    WHERE ua.tenant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM captacao_configuracoes cfg
      WHERE cfg.tenant_id = ua.tenant_id
      );
  `,
    `
    INSERT INTO permissao (nome)
    VALUES
      ${captacaoPermissions.map((item) => `('${item}')`).join(",\n      ")}
    ON CONFLICT (nome) DO NOTHING;
  `,
    `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT DISTINCT admin.usuario_id, permissao_nova.id
    FROM usuario_permissao admin
    INNER JOIN permissao permissao_admin
      ON permissao_admin.id = admin.permissao_id
     AND permissao_admin.nome = 'ADMINISTRADOR'
    CROSS JOIN permissao permissao_nova
    WHERE permissao_nova.nome IN (${captacaoPermissions.map((item) => `'${item}'`).join(", ")})
    ON CONFLICT DO NOTHING;
  `
];
let ensurePromise = null;
function numberOrZero(value) {
    if (value == null)
        return 0;
    if (typeof value === "number")
        return value;
    return Number(value);
}
function toPgDate(value) {
    const parsed = toOptionalDate(value);
    return parsed ? parsed.toISOString().slice(0, 10) : null;
}
function toTimestamp(value) {
    if (!value)
        return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
function tenantFilter(alias, tenantId) {
    if (!tenantId)
        return "1 = 1";
    return alias ? `${alias}.tenant_id::text = '${tenantId}'` : `tenant_id::text = '${tenantId}'`;
}
export async function ensureCaptacaoRecursosEstrutura() {
    if (!ensurePromise) {
        ensurePromise = (async () => {
            for (const sql of sqlEstrutura) {
                await prisma.$executeRawUnsafe(sql);
            }
            await prisma.$executeRawUnsafe(`
        DELETE FROM captacao_configuracoes cfg
        USING (
          SELECT id
          FROM (
            SELECT
              id,
              ROW_NUMBER() OVER (
                PARTITION BY tenant_id
                ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
              ) AS rn
            FROM captacao_configuracoes
            WHERE tenant_id IS NOT NULL
          ) duplicadas
          WHERE duplicadas.rn > 1
        ) purge
        WHERE cfg.id = purge.id
      `);
            await prisma.$executeRawUnsafe("CREATE UNIQUE INDEX IF NOT EXISTS captacao_configuracoes_tenant_unique_idx ON captacao_configuracoes (tenant_id) WHERE tenant_id IS NOT NULL;");
        })().catch((error) => {
            ensurePromise = null;
            throw error;
        });
    }
    await ensurePromise;
}
export class CaptacaoRecursosRepository {
    async ensureStructure() {
        await ensureCaptacaoRecursosEstrutura();
    }
    async query(sql, params = []) {
        await this.ensureStructure();
        return prisma.$queryRawUnsafe(sql, ...params);
    }
    async exec(sql, params = []) {
        await this.ensureStructure();
        return prisma.$executeRawUnsafe(sql, ...params);
    }
    async ajustarCampanhasEncerradas() {
        await this.exec(`
        UPDATE captacao_campanhas
           SET status = 'encerrada',
               updated_at = NOW()
         WHERE deleted_at IS NULL
           AND status IN ('ativa', 'pausada', 'rascunho')
           AND data_final IS NOT NULL
          AND data_final < CURRENT_DATE;
      `);
    }
    async listarDoadores(filters, tenantId) {
        await this.ajustarCampanhasEncerradas();
        const params = [];
        const parts = ["d.deleted_at IS NULL", tenantFilter("d", tenantId)];
        const pagina = Math.max(1, Number(filters.pagina ?? 1) || 1);
        const limite = Math.min(100, Math.max(1, Number(filters.limite ?? 20) || 20));
        const offset = (pagina - 1) * limite;
        const push = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        if (trimOrUndefined(String(filters.termo ?? ""))) {
            const termo = `%${trimOrUndefined(String(filters.termo))}%`;
            const param = push(termo);
            parts.push(`(d.nome ILIKE ${param} OR COALESCE(d.nome_fantasia, '') ILIKE ${param} OR COALESCE(d.email_principal, '') ILIKE ${param} OR COALESCE(d.cpf_cnpj_norm, '') ILIKE ${param})`);
        }
        if (trimOrUndefined(String(filters.tipoDoador ?? ""))) {
            parts.push(`d.tipo_doador = ${push(String(filters.tipoDoador))}`);
        }
        if (trimOrUndefined(String(filters.status ?? ""))) {
            parts.push(`d.status = ${push(String(filters.status))}`);
        }
        if (trimOrUndefined(String(filters.responsavel ?? ""))) {
            parts.push(`COALESCE(d.responsavel_relacionamento, '') ILIKE ${push(`%${String(filters.responsavel)}%`)}`);
        }
        const where = parts.join(" AND ");
        const baseFrom = `
      FROM captacao_doadores d
      LEFT JOIN (
        SELECT
          doador_id,
          COUNT(*) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado'))::INT AS quantidade_doacoes,
          COALESCE(SUM(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS total_doado,
          COALESCE(AVG(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS ticket_medio,
          MAX(data_hora) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')) AS ultima_doacao,
          COALESCE(MAX(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS maior_doacao,
          COUNT(DISTINCT campanha_id) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado') AND campanha_id IS NOT NULL)::INT AS campanhas_apoiadas,
          BOOL_OR(recorrencia_id IS NOT NULL AND situacao IN ('pendente', 'aguardando_pagamento', 'pago', 'confirmado')) AS recorrencia_ativa
        FROM captacao_doacoes
        GROUP BY doador_id
      ) stats ON stats.doador_id = d.id
      WHERE ${where}
    `;
        const rows = await this.query(`
        SELECT
          d.*,
          COALESCE(stats.quantidade_doacoes, 0) AS quantidade_doacoes,
          COALESCE(stats.total_doado, 0) AS total_doado,
          COALESCE(stats.ticket_medio, 0) AS ticket_medio,
          stats.ultima_doacao,
          COALESCE(stats.maior_doacao, 0) AS maior_doacao,
          COALESCE(stats.campanhas_apoiadas, 0) AS campanhas_apoiadas,
          COALESCE(stats.recorrencia_ativa, FALSE) AS recorrencia_ativa
        ${baseFrom}
        ORDER BY d.updated_at DESC, d.id DESC
        LIMIT ${push(limite)} OFFSET ${push(offset)};
      `, params);
        const countRows = await this.query(`SELECT COUNT(*)::BIGINT AS total ${baseFrom}`, params.slice(0, params.length - 2));
        return {
            rows,
            total: Number(countRows[0]?.total ?? 0)
        };
    }
    async buscarDoadorPorIdOuFalhar(id, tenantId) {
        const rows = await this.query(`
        SELECT d.*,
               COALESCE(stats.quantidade_doacoes, 0) AS quantidade_doacoes,
               COALESCE(stats.total_doado, 0) AS total_doado,
               COALESCE(stats.ticket_medio, 0) AS ticket_medio,
               stats.ultima_doacao,
               COALESCE(stats.maior_doacao, 0) AS maior_doacao,
               COALESCE(stats.campanhas_apoiadas, 0) AS campanhas_apoiadas,
               COALESCE(stats.recorrencia_ativa, FALSE) AS recorrencia_ativa
        FROM captacao_doadores d
        LEFT JOIN (
          SELECT
            doador_id,
            COUNT(*) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado'))::INT AS quantidade_doacoes,
            COALESCE(SUM(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS total_doado,
            COALESCE(AVG(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS ticket_medio,
            MAX(data_hora) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')) AS ultima_doacao,
            COALESCE(MAX(valor_liquido) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado')), 0)::DOUBLE PRECISION AS maior_doacao,
            COUNT(DISTINCT campanha_id) FILTER (WHERE deleted_at IS NULL AND situacao IN ('pago', 'confirmado') AND campanha_id IS NOT NULL)::INT AS campanhas_apoiadas,
            BOOL_OR(recorrencia_id IS NOT NULL AND situacao IN ('pendente', 'aguardando_pagamento', 'pago', 'confirmado')) AS recorrencia_ativa
          FROM captacao_doacoes
          GROUP BY doador_id
        ) stats ON stats.doador_id = d.id
        WHERE d.id = $1 AND d.deleted_at IS NULL AND ${tenantFilter("d", tenantId)}
        LIMIT 1
      `, [id]);
        if (!rows[0]) {
            throw new AppError("Doador nao encontrado.", 404);
        }
        return rows[0];
    }
    async buscarDoadorDuplicado(documentoNorm, emailNorm, ignoreId, tenantId) {
        const params = [];
        const parts = ["deleted_at IS NULL", tenantFilter("", tenantId)];
        const push = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        const comparadores = [];
        if (documentoNorm)
            comparadores.push(`cpf_cnpj_norm = ${push(documentoNorm)}`);
        if (emailNorm)
            comparadores.push(`email_principal_norm = ${push(emailNorm)}`);
        if (!comparadores.length)
            return undefined;
        parts.push(`(${comparadores.join(" OR ")})`);
        if (ignoreId) {
            parts.push(`id <> ${push(ignoreId)}`);
        }
        const rows = await this.query(`
        SELECT *
        FROM captacao_doadores
        WHERE ${parts.join(" AND ")}
        LIMIT 1
      `, params);
        return rows[0];
    }
    async salvarDoador(id, uuid, input, userId, tenantId) {
        const payload = {
            tipoDoador: input.tipoDoador,
            nome: input.nome,
            nomeFantasia: input.nomeFantasia ?? null,
            cpfCnpj: input.cpfCnpj ?? null,
            cpfCnpjNorm: input.cpfCnpjNorm ?? null,
            dataNascimentoFundacao: toPgDate(String(input.dataNascimentoFundacao ?? "")),
            emailPrincipal: input.emailPrincipal ?? null,
            emailPrincipalNorm: input.emailPrincipalNorm ?? null,
            emailSecundario: input.emailSecundario ?? null,
            emailSecundarioNorm: input.emailSecundarioNorm ?? null,
            telefone: input.telefone ?? null,
            telefoneNorm: input.telefoneNorm ?? null,
            whatsapp: input.whatsapp ?? null,
            whatsappNorm: input.whatsappNorm ?? null,
            enderecoCompleto: input.enderecoCompleto ?? null,
            bairro: input.bairro ?? null,
            cidade: input.cidade ?? null,
            uf: input.uf ?? null,
            cep: input.cep ?? null,
            cepNorm: input.cepNorm ?? null,
            observacoes: input.observacoes ?? null,
            origemCadastro: input.origemCadastro ?? null,
            status: input.status ?? "ativo",
            aceitouLgpd: Boolean(input.aceitouLgpd),
            dataAceiteLgpd: toPgDate(String(input.dataAceiteLgpd ?? "")),
            aceitaEmail: Boolean(input.aceitaEmail),
            aceitaWhatsapp: Boolean(input.aceitaWhatsapp),
            aceitaReceberCampanhas: Boolean(input.aceitaReceberCampanhas),
            categoriaDoador: input.categoriaDoador ?? null,
            segmentoRelacionamento: input.segmentoRelacionamento ?? null,
            statusRetencao: input.statusRetencao ?? null,
            motivoRisco: input.motivoRisco ?? null,
            proximaAcaoSugerida: input.proximaAcaoSugerida ?? null,
            scoreRelacionamento: Number(input.scoreRelacionamento ?? 0) || 0,
            responsavelRelacionamento: input.responsavelRelacionamento ?? null,
            observacoesInternas: input.observacoesInternas ?? null,
            portalAtivo: Boolean(input.portalAtivo),
            anexoPrincipalCaminho: input.anexoPrincipalCaminho ?? null
        };
        const params = [
            uuid,
            payload.tipoDoador,
            payload.nome,
            payload.nomeFantasia,
            payload.cpfCnpj,
            payload.cpfCnpjNorm,
            payload.dataNascimentoFundacao,
            payload.emailPrincipal,
            payload.emailPrincipalNorm,
            payload.emailSecundario,
            payload.emailSecundarioNorm,
            payload.telefone,
            payload.telefoneNorm,
            payload.whatsapp,
            payload.whatsappNorm,
            payload.enderecoCompleto,
            payload.bairro,
            payload.cidade,
            payload.uf,
            payload.cep,
            payload.cepNorm,
            payload.observacoes,
            payload.origemCadastro,
            payload.status,
            payload.aceitouLgpd,
            payload.dataAceiteLgpd,
            payload.aceitaEmail,
            payload.aceitaWhatsapp,
            payload.aceitaReceberCampanhas,
            payload.categoriaDoador,
            payload.segmentoRelacionamento,
            payload.statusRetencao,
            payload.motivoRisco,
            payload.proximaAcaoSugerida,
            payload.scoreRelacionamento,
            payload.responsavelRelacionamento,
            payload.observacoesInternas,
            payload.portalAtivo,
            payload.anexoPrincipalCaminho,
            userId ?? null,
            tenantId ?? null
        ];
        let row;
        if (!id) {
            row = (await this.query(`
            INSERT INTO captacao_doadores (
              uuid, tipo_doador, nome, nome_fantasia, cpf_cnpj, cpf_cnpj_norm,
              data_nascimento_fundacao, email_principal, email_principal_norm, email_secundario, email_secundario_norm,
              telefone, telefone_norm, whatsapp, whatsapp_norm, endereco_completo, bairro, cidade, uf, cep, cep_norm,
              observacoes, origem_cadastro, status, aceitou_lgpd, data_aceite_lgpd, aceita_email, aceita_whatsapp,
              aceita_receber_campanhas, categoria_doador, segmento_relacionamento, status_retencao, motivo_risco,
              proxima_acao_sugerida, score_relacionamento, responsavel_relacionamento, observacoes_internas,
              portal_ativo, anexo_principal_caminho, created_by, updated_by, tenant_id
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$40,$41
            )
            RETURNING *
          `, params))[0];
        }
        else {
            row = (await this.query(`
            UPDATE captacao_doadores
               SET tipo_doador = $2,
                   nome = $3,
                   nome_fantasia = $4,
                   cpf_cnpj = $5,
                   cpf_cnpj_norm = $6,
                   data_nascimento_fundacao = $7,
                   email_principal = $8,
                   email_principal_norm = $9,
                   email_secundario = $10,
                   email_secundario_norm = $11,
                   telefone = $12,
                   telefone_norm = $13,
                   whatsapp = $14,
                   whatsapp_norm = $15,
                   endereco_completo = $16,
                   bairro = $17,
                   cidade = $18,
                   uf = $19,
                   cep = $20,
                   cep_norm = $21,
                   observacoes = $22,
                   origem_cadastro = $23,
                   status = $24,
                   aceitou_lgpd = $25,
                   data_aceite_lgpd = $26,
                   aceita_email = $27,
                   aceita_whatsapp = $28,
                   aceita_receber_campanhas = $29,
                   categoria_doador = $30,
                   segmento_relacionamento = $31,
                   status_retencao = $32,
                   motivo_risco = $33,
                   proxima_acao_sugerida = $34,
                   score_relacionamento = $35,
                   responsavel_relacionamento = $36,
                   observacoes_internas = $37,
                   portal_ativo = $38,
                   anexo_principal_caminho = $39,
                   updated_by = $40,
                   updated_at = NOW()
             WHERE id = $41 AND deleted_at IS NULL AND ${tenantFilter("captacao_doadores", tenantId)}
            RETURNING *
          `, [...params, id]))[0];
        }
        if (!row) {
            throw new AppError("Nao foi possivel salvar o doador.", 500);
        }
        const doadorId = BigInt(String(row.id));
        await this.exec(`DELETE FROM captacao_doadores_contatos WHERE doador_id = $1 AND ${tenantFilter("captacao_doadores_contatos", tenantId)}`, [doadorId]);
        const contatos = [
            { tipo: "email_principal", valor: payload.emailPrincipal, valorNorm: payload.emailPrincipalNorm, principal: true },
            { tipo: "email_secundario", valor: payload.emailSecundario, valorNorm: payload.emailSecundarioNorm, principal: false },
            { tipo: "telefone", valor: payload.telefone, valorNorm: payload.telefoneNorm, principal: false },
            { tipo: "whatsapp", valor: payload.whatsapp, valorNorm: payload.whatsappNorm, principal: false }
        ].filter((item) => item.valor);
        for (const contato of contatos) {
            await this.exec(`
          INSERT INTO captacao_doadores_contatos (
            uuid, doador_id, tipo_contato, valor, valor_norm, principal, created_by, updated_by, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
        `, [randomUUID(), doadorId, contato.tipo, contato.valor, contato.valorNorm, contato.principal, userId ?? null, tenantId ?? null]);
        }
        await this.exec(`
        INSERT INTO captacao_preferencias_comunicacao (
          uuid, doador_id, aceita_email, aceita_whatsapp, aceita_campanhas, aceite_lgpd, data_aceite_lgpd, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
        ON CONFLICT (doador_id) DO UPDATE SET
          aceita_email = EXCLUDED.aceita_email,
          aceita_whatsapp = EXCLUDED.aceita_whatsapp,
          aceita_campanhas = EXCLUDED.aceita_campanhas,
          aceite_lgpd = EXCLUDED.aceite_lgpd,
          data_aceite_lgpd = EXCLUDED.data_aceite_lgpd,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `, [
            randomUUID(),
            doadorId,
            payload.aceitaEmail,
            payload.aceitaWhatsapp,
            payload.aceitaReceberCampanhas,
            payload.aceitouLgpd,
            payload.dataAceiteLgpd,
            userId ?? null,
            tenantId ?? null
        ]);
        return row;
    }
    async inativarDoador(id, userId, tenantId) {
        const row = (await this.query(`
          UPDATE captacao_doadores
             SET status = 'inativo',
                 updated_by = $2,
                 updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL AND ${tenantFilter("captacao_doadores", tenantId)}
           RETURNING *
        `, [id, userId ?? null]))[0];
        if (!row)
            throw new AppError("Doador nao encontrado.", 404);
        return row;
    }
    async listarTarefasRelacionamentoPorDoador(doadorId, tenantId) {
        return this.query(`
        SELECT *
        FROM captacao_tarefas_relacionamento
        WHERE doador_id = $1 AND ${tenantFilter("captacao_tarefas_relacionamento", tenantId)}
        ORDER BY
          CASE status
            WHEN 'pendente' THEN 0
            WHEN 'em_andamento' THEN 1
            WHEN 'concluida' THEN 2
            ELSE 3
          END,
          data_prevista ASC NULLS LAST,
          created_at DESC,
          id DESC
      `, [doadorId]);
    }
    async salvarTarefaRelacionamento(doadorId, input, userId, tenantId) {
        const payload = {
            titulo: trimOrUndefined(String(input.titulo ?? "")),
            descricao: trimOrUndefined(String(input.descricao ?? "")),
            status: trimOrUndefined(String(input.status ?? "")) ?? "pendente",
            prioridade: trimOrUndefined(String(input.prioridade ?? "")) ?? "media",
            tipo: trimOrUndefined(String(input.tipo ?? "")) ?? "follow_up",
            responsavel: trimOrUndefined(String(input.responsavel ?? "")),
            dataPrevista: toPgDate(String(input.dataPrevista ?? "")),
            origem: trimOrUndefined(String(input.origem ?? "")) ?? "manual"
        };
        const row = (await this.query(`
          INSERT INTO captacao_tarefas_relacionamento (
            uuid, doador_id, titulo, descricao, status, prioridade, tipo, responsavel, data_prevista, origem,
            created_by, updated_by, tenant_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
          RETURNING *
        `, [
            randomUUID(),
            doadorId,
            payload.titulo,
            payload.descricao,
            payload.status,
            payload.prioridade,
            payload.tipo,
            payload.responsavel,
            payload.dataPrevista,
            payload.origem,
            userId ?? null,
            tenantId ?? null
        ]))[0];
        if (!row) {
            throw new AppError("Nao foi possivel salvar a tarefa de relacionamento.", 500);
        }
        return row;
    }
    async concluirTarefaRelacionamento(id, userId, tenantId) {
        const row = (await this.query(`
          UPDATE captacao_tarefas_relacionamento
             SET status = 'concluida',
                 concluida_em = NOW(),
                 updated_by = $2,
                 updated_at = NOW()
           WHERE id = $1 AND ${tenantFilter("captacao_tarefas_relacionamento", tenantId)}
           RETURNING *
        `, [id, userId ?? null]))[0];
        if (!row) {
            throw new AppError("Tarefa de relacionamento nao encontrada.", 404);
        }
        return row;
    }
    async listarCampanhas(filters, tenantId) {
        await this.ajustarCampanhasEncerradas();
        const params = [];
        const parts = ["c.deleted_at IS NULL", tenantFilter("c", tenantId)];
        const pagina = Math.max(1, Number(filters.pagina ?? 1) || 1);
        const limite = Math.min(100, Math.max(1, Number(filters.limite ?? 20) || 20));
        const offset = (pagina - 1) * limite;
        const push = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        if (trimOrUndefined(String(filters.termo ?? ""))) {
            const termo = `%${trimOrUndefined(String(filters.termo))}%`;
            const param = push(termo);
            parts.push(`(c.nome ILIKE ${param} OR COALESCE(c.descricao_curta, '') ILIKE ${param})`);
        }
        if (trimOrUndefined(String(filters.status ?? ""))) {
            parts.push(`c.status = ${push(String(filters.status))}`);
        }
        const where = parts.join(" AND ");
        const baseFrom = `
      FROM captacao_campanhas c
      LEFT JOIN captacao_campanhas_metricas m ON m.campanha_id = c.id
      WHERE ${where}
    `;
        const rows = await this.query(`
        SELECT
          c.*,
          COALESCE(m.total_arrecadado, c.valor_arrecadado, 0)::DOUBLE PRECISION AS total_arrecadado,
          COALESCE(m.total_doacoes, 0)::INT AS total_doacoes,
          COALESCE(m.total_doadores, 0)::INT AS total_doadores,
          COALESCE(m.percentual_atingido, c.percentual_atingido, 0)::DOUBLE PRECISION AS percentual_atingido
        ${baseFrom}
        ORDER BY c.destaque_no_portal DESC, c.updated_at DESC, c.id DESC
        LIMIT ${push(limite)} OFFSET ${push(offset)}
      `, params);
        const countRows = await this.query(`SELECT COUNT(*)::BIGINT AS total ${baseFrom}`, params.slice(0, params.length - 2));
        return { rows, total: Number(countRows[0]?.total ?? 0) };
    }
    async buscarCampanhaPorIdOuFalhar(id, tenantId) {
        const rows = await this.query(`
        SELECT c.*, COALESCE(m.total_arrecadado, c.valor_arrecadado, 0)::DOUBLE PRECISION AS total_arrecadado,
               COALESCE(m.total_doacoes, 0)::INT AS total_doacoes,
               COALESCE(m.total_doadores, 0)::INT AS total_doadores,
               COALESCE(m.percentual_atingido, c.percentual_atingido, 0)::DOUBLE PRECISION AS percentual_atingido
        FROM captacao_campanhas c
        LEFT JOIN captacao_campanhas_metricas m ON m.campanha_id = c.id
        WHERE c.id = $1 AND c.deleted_at IS NULL AND ${tenantFilter("c", tenantId)}
        LIMIT 1
      `, [id]);
        if (!rows[0]) {
            throw new AppError("Campanha nao encontrada.", 404);
        }
        return rows[0];
    }
    async salvarCampanha(id, uuid, input, userId, tenantId) {
        const params = [
            uuid,
            input.nome,
            input.descricaoCurta ?? null,
            input.descricaoCompleta ?? null,
            input.objetivo ?? null,
            numberOrZero(input.metaFinanceira),
            toPgDate(String(input.dataInicial ?? "")),
            toPgDate(String(input.dataFinal ?? "")),
            input.status,
            input.imagemBanner ?? null,
            input.corDestaque ?? null,
            input.tipo,
            input.responsavel ?? null,
            Boolean(input.destaqueNoPortal),
            Boolean(input.visivelAoPublico),
            input.urlPublica ?? null,
            input.qrCodePublico ?? null,
            input.mensagemAgradecimento ?? null,
            userId ?? null,
            tenantId ?? null
        ];
        let row;
        if (!id) {
            row = (await this.query(`
            INSERT INTO captacao_campanhas (
              uuid, nome, descricao_curta, descricao_completa, objetivo, meta_financeira,
              data_inicial, data_final, status, imagem_banner, cor_destaque, tipo, responsavel,
              destaque_no_portal, visivel_ao_publico, url_publica, qr_code_publico, mensagem_agradecimento,
              created_by, updated_by, tenant_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19,$20)
            RETURNING *
          `, params))[0];
        }
        else {
            row = (await this.query(`
            UPDATE captacao_campanhas
               SET nome = $2,
                   descricao_curta = $3,
                   descricao_completa = $4,
                   objetivo = $5,
                   meta_financeira = $6,
                   data_inicial = $7,
                   data_final = $8,
                   status = $9,
                   imagem_banner = $10,
                   cor_destaque = $11,
                   tipo = $12,
                   responsavel = $13,
                   destaque_no_portal = $14,
                   visivel_ao_publico = $15,
                   url_publica = $16,
                   qr_code_publico = $17,
                   mensagem_agradecimento = $18,
                   updated_by = $19,
                   updated_at = NOW()
             WHERE id = $20 AND deleted_at IS NULL AND ${tenantFilter("captacao_campanhas", tenantId)}
             RETURNING *
          `, [...params, id]))[0];
        }
        if (!row)
            throw new AppError("Nao foi possivel salvar a campanha.", 500);
        await this.exec(`
        INSERT INTO captacao_campanhas_metricas (
          uuid, campanha_id, total_arrecadado, total_doacoes, total_doadores, percentual_atingido, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, 0, 0, 0, 0, $3, $3, $4)
        ON CONFLICT (campanha_id) DO NOTHING
      `, [randomUUID(), row.id, userId ?? null, tenantId ?? null]);
        await this.recalcularMetricasCampanha(BigInt(String(row.id)), userId, tenantId);
        return this.buscarCampanhaPorIdOuFalhar(BigInt(String(row.id)), tenantId);
    }
    async alterarStatusCampanha(id, status, userId, tenantId) {
        const row = (await this.query(`
          UPDATE captacao_campanhas
             SET status = $2,
                 updated_by = $3,
                 updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL AND ${tenantFilter("captacao_campanhas", tenantId)}
           RETURNING *
        `, [id, status, userId ?? null]))[0];
        if (!row)
            throw new AppError("Campanha nao encontrada.", 404);
        return row;
    }
    async recalcularMetricasCampanha(campanhaId, userId, tenantId) {
        await this.exec(`
        UPDATE captacao_campanhas_metricas metricas
           SET total_arrecadado = base.total_arrecadado,
               total_doacoes = base.total_doacoes,
               total_doadores = base.total_doadores,
               percentual_atingido = base.percentual_atingido,
               updated_at = NOW(),
               atualizado_em = NOW(),
               updated_by = $2
          FROM (
            SELECT
              c.id AS campanha_id,
              COALESCE(SUM(d.valor_liquido) FILTER (WHERE d.deleted_at IS NULL AND d.situacao IN ('pago', 'confirmado')), 0)::NUMERIC(14,2) AS total_arrecadado,
              COUNT(*) FILTER (WHERE d.deleted_at IS NULL AND d.situacao IN ('pago', 'confirmado'))::INT AS total_doacoes,
              COUNT(DISTINCT d.doador_id) FILTER (WHERE d.deleted_at IS NULL AND d.situacao IN ('pago', 'confirmado') AND d.doador_id IS NOT NULL)::INT AS total_doadores,
              CASE
                WHEN COALESCE(c.meta_financeira, 0) <= 0 THEN 0
                ELSE ROUND(
                  (COALESCE(SUM(d.valor_liquido) FILTER (WHERE d.deleted_at IS NULL AND d.situacao IN ('pago', 'confirmado')), 0) / c.meta_financeira) * 100,
                  2
                )
              END AS percentual_atingido
            FROM captacao_campanhas c
            LEFT JOIN captacao_doacoes d ON d.campanha_id = c.id
            WHERE c.id = $1 AND ${tenantFilter("c", tenantId)}
            GROUP BY c.id, c.meta_financeira
          ) base
         WHERE metricas.campanha_id = base.campanha_id
      `, [campanhaId, userId ?? null]);
        await this.exec(`
        UPDATE captacao_campanhas c
           SET valor_arrecadado = m.total_arrecadado,
               percentual_atingido = m.percentual_atingido,
               updated_at = NOW()
          FROM captacao_campanhas_metricas m
         WHERE c.id = m.campanha_id
           AND c.id = $1
           AND ${tenantFilter("c", tenantId)}
      `, [campanhaId]);
    }
    async listarDoacoes(filters, tenantId) {
        await this.ajustarCampanhasEncerradas();
        const params = [];
        const parts = ["d.deleted_at IS NULL", tenantFilter("d", tenantId)];
        const pagina = Math.max(1, Number(filters.pagina ?? 1) || 1);
        const limite = Math.min(100, Math.max(1, Number(filters.limite ?? 20) || 20));
        const offset = (pagina - 1) * limite;
        const push = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        if (trimOrUndefined(String(filters.termo ?? ""))) {
            const termo = `%${trimOrUndefined(String(filters.termo))}%`;
            const param = push(termo);
            parts.push(`(d.numero_doacao ILIKE ${param} OR COALESCE(doadores.nome, '') ILIKE ${param} OR COALESCE(campanhas.nome, '') ILIKE ${param})`);
        }
        if (trimOrUndefined(String(filters.campanhaId ?? "")))
            parts.push(`d.campanha_id = ${push(filters.campanhaId)}`);
        if (trimOrUndefined(String(filters.doadorId ?? "")))
            parts.push(`d.doador_id = ${push(filters.doadorId)}`);
        if (trimOrUndefined(String(filters.formaPagamento ?? "")))
            parts.push(`d.forma_pagamento = ${push(filters.formaPagamento)}`);
        if (trimOrUndefined(String(filters.situacao ?? "")))
            parts.push(`d.situacao = ${push(filters.situacao)}`);
        if (trimOrUndefined(String(filters.origem ?? "")))
            parts.push(`d.origem = ${push(filters.origem)}`);
        if (trimOrUndefined(String(filters.tipoDoacao ?? "")))
            parts.push(`d.tipo_doacao = ${push(filters.tipoDoacao)}`);
        if (trimOrUndefined(String(filters.periodoInicio ?? "")))
            parts.push(`d.data_hora >= ${push(String(filters.periodoInicio))}::date`);
        if (trimOrUndefined(String(filters.periodoFim ?? "")))
            parts.push(`d.data_hora < (${push(String(filters.periodoFim))}::date + INTERVAL '1 day')`);
        const where = parts.join(" AND ");
        const baseFrom = `
      FROM captacao_doacoes d
      LEFT JOIN captacao_doadores doadores ON doadores.id = d.doador_id
      LEFT JOIN captacao_campanhas campanhas ON campanhas.id = d.campanha_id
      LEFT JOIN captacao_recorrencias recorrencias ON recorrencias.id = d.recorrencia_id
      LEFT JOIN captacao_transacoes_pix pix ON pix.doacao_id = d.id
      LEFT JOIN captacao_transacoes_cartao cartao ON cartao.doacao_id = d.id
      LEFT JOIN captacao_transacoes_boleto boleto ON boleto.doacao_id = d.id
      WHERE ${where}
    `;
        const rows = await this.query(`
        SELECT
          d.*,
          doadores.nome AS doador_nome,
          campanhas.nome AS campanha_nome,
          recorrencias.status AS recorrencia_status,
          pix.qr_code_svg,
          pix.payload_pix,
          boleto.linha_digitavel,
          boleto.codigo_barras,
          cartao.referencia_externa AS cartao_referencia
        ${baseFrom}
        ORDER BY d.data_hora DESC, d.id DESC
        LIMIT ${push(limite)} OFFSET ${push(offset)}
      `, params);
        const countRows = await this.query(`SELECT COUNT(*)::BIGINT AS total ${baseFrom}`, params.slice(0, params.length - 2));
        return { rows, total: Number(countRows[0]?.total ?? 0) };
    }
    async buscarDoacaoPorIdOuFalhar(id, tenantId) {
        const rows = await this.query(`
        SELECT
          d.*,
          doadores.nome AS doador_nome,
          campanhas.nome AS campanha_nome,
          recorrencias.status AS recorrencia_status,
          pix.qr_code_svg,
          pix.payload_pix,
          pix.provider_nome AS pix_provider_nome,
          cartao.referencia_externa AS cartao_referencia,
          boleto.linha_digitavel,
          boleto.codigo_barras,
          boleto.nosso_numero
        FROM captacao_doacoes d
        LEFT JOIN captacao_doadores doadores ON doadores.id = d.doador_id
        LEFT JOIN captacao_campanhas campanhas ON campanhas.id = d.campanha_id
        LEFT JOIN captacao_recorrencias recorrencias ON recorrencias.id = d.recorrencia_id
        LEFT JOIN captacao_transacoes_pix pix ON pix.doacao_id = d.id
        LEFT JOIN captacao_transacoes_cartao cartao ON cartao.doacao_id = d.id
        LEFT JOIN captacao_transacoes_boleto boleto ON boleto.doacao_id = d.id
        WHERE d.id = $1 AND d.deleted_at IS NULL AND ${tenantFilter("d", tenantId)}
        LIMIT 1
      `, [id]);
        if (!rows[0])
            throw new AppError("Doacao nao encontrada.", 404);
        return rows[0];
    }
    async salvarRecorrencia(id, uuid, doadorId, campanhaId, input, referenciaExterna, userId, tenantId) {
        const params = [
            uuid,
            doadorId,
            campanhaId,
            numberOrZero(input.valorRecorrente),
            input.periodicidade,
            input.formaPagamento,
            toPgDate(String(input.dataProximaCobranca ?? "")),
            input.quantidadeCiclos ?? null,
            Boolean(input.semPrevisaoTermino),
            input.status ?? "ativa",
            referenciaExterna ?? null,
            userId ?? null,
            tenantId ?? null
        ];
        const rows = id
            ? await this.query(`
            UPDATE captacao_recorrencias
               SET doador_id = $2,
                   campanha_id = $3,
                   valor_recorrente = $4,
                   periodicidade = $5,
                   forma_pagamento = $6,
                   data_proxima_cobranca = $7,
                   quantidade_ciclos = $8,
                   sem_previsao_termino = $9,
                   status = $10,
                   referencia_externa = $11,
                   updated_by = $12,
                   updated_at = NOW()
             WHERE id = $13 AND deleted_at IS NULL AND ${tenantFilter("captacao_recorrencias", tenantId)}
             RETURNING *
          `, [...params, id])
            : await this.query(`
            INSERT INTO captacao_recorrencias (
              uuid, doador_id, campanha_id, valor_recorrente, periodicidade, forma_pagamento,
              data_proxima_cobranca, quantidade_ciclos, sem_previsao_termino, status, referencia_externa, created_by, updated_by, tenant_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13)
            RETURNING *
          `, params);
        if (!rows[0])
            throw new AppError("Nao foi possivel salvar a recorrencia.", 500);
        return rows[0];
    }
    async salvarDoacao(id, uuid, numeroDoacao, input, userId, tenantId) {
        const params = [
            uuid,
            numeroDoacao,
            input.doadorId ? BigInt(String(input.doadorId)) : null,
            input.campanhaId ? BigInt(String(input.campanhaId)) : null,
            input.recorrenciaId ? BigInt(String(input.recorrenciaId)) : null,
            numberOrZero(input.valor),
            numberOrZero(input.valorLiquido ?? input.valor),
            numberOrZero(input.valorTaxas),
            input.tipoDoacao,
            input.formaPagamento,
            input.situacao,
            input.origem,
            input.identificadorExterno ?? null,
            input.txid ?? null,
            input.linkPagamento ?? null,
            toPgDate(String(input.dataVencimento ?? "")),
            input.observacoesInternas ?? null,
            input.usuarioResponsavel ?? null,
            Boolean(input.comprovanteGerado),
            userId ?? null,
            tenantId ?? null
        ];
        const rows = id
            ? await this.query(`
            UPDATE captacao_doacoes
               SET doador_id = $3,
                   campanha_id = $4,
                   recorrencia_id = $5,
                   valor = $6,
                   valor_liquido = $7,
                   valor_taxas = $8,
                   tipo_doacao = $9,
                   forma_pagamento = $10,
                   situacao = $11,
                   origem = $12,
                   identificador_externo = $13,
                   txid = $14,
                   link_pagamento = $15,
                   data_vencimento = $16,
                   observacoes_internas = $17,
                   usuario_responsavel = $18,
                   comprovante_gerado = $19,
                   updated_by = $20,
                   updated_at = NOW()
             WHERE id = $21 AND deleted_at IS NULL AND ${tenantFilter("captacao_doacoes", tenantId)}
             RETURNING *
          `, [...params, id])
            : await this.query(`
            INSERT INTO captacao_doacoes (
              uuid, numero_doacao, doador_id, campanha_id, recorrencia_id, valor, valor_liquido,
              valor_taxas, tipo_doacao, forma_pagamento, situacao, origem, identificador_externo,
              txid, link_pagamento, data_vencimento, observacoes_internas, usuario_responsavel,
              comprovante_gerado, created_by, updated_by, tenant_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20,$21)
            RETURNING *
          `, params);
        if (!rows[0])
            throw new AppError("Nao foi possivel salvar a doacao.", 500);
        return rows[0];
    }
    async alterarSituacaoDoacao(id, situacao, userId, tenantId, extras) {
        const rows = await this.query(`
        UPDATE captacao_doacoes
           SET situacao = $2,
               txid = COALESCE($3, txid),
               link_pagamento = COALESCE($4, link_pagamento),
               comprovante_gerado = COALESCE($5, comprovante_gerado),
               updated_by = $6,
               updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL AND ${tenantFilter("captacao_doacoes", tenantId)}
         RETURNING *
      `, [id, situacao, extras?.txid ?? null, extras?.linkPagamento ?? null, extras?.comprovanteGerado ?? null, userId ?? null]);
        if (!rows[0])
            throw new AppError("Doacao nao encontrada.", 404);
        return rows[0];
    }
    async registrarEventoDoacao(doacaoId, tipoEvento, descricao, payloadJson, userId, tenantId) {
        await this.exec(`
        INSERT INTO captacao_doacoes_eventos (
          uuid, doacao_id, tipo_evento, descricao, payload_json, created_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, CAST($5 AS JSONB), $6, $7)
      `, [randomUUID(), doacaoId, tipoEvento, descricao, JSON.stringify(payloadJson ?? {}), userId ?? null, tenantId ?? null]);
    }
    async listarEventosDoacao(doacaoId, tenantId) {
        return this.query(`SELECT * FROM captacao_doacoes_eventos WHERE doacao_id = $1 AND ${tenantFilter("captacao_doacoes_eventos", tenantId)} ORDER BY created_at DESC, id DESC`, [doacaoId]);
    }
    async salvarTransacaoPix(doacaoId, result, userId, tenantId) {
        await this.exec(`
        INSERT INTO captacao_transacoes_pix (
          uuid, doacao_id, txid, payload_pix, qr_code_svg, status, data_expiracao, provider_nome, payload_json, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CAST($9 AS JSONB), $10, $10, $11)
        ON CONFLICT (doacao_id) DO UPDATE SET
          txid = EXCLUDED.txid,
          payload_pix = EXCLUDED.payload_pix,
          qr_code_svg = EXCLUDED.qr_code_svg,
          status = EXCLUDED.status,
          data_expiracao = EXCLUDED.data_expiracao,
          provider_nome = EXCLUDED.provider_nome,
          payload_json = EXCLUDED.payload_json,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `, [randomUUID(), doacaoId, result.txid ?? null, result.qrCodeCopiaCola ?? null, result.qrCodeSvg ?? null, result.status ?? "aguardando_pagamento", toTimestamp(String(result.expiresAt ?? "")), result.provider ?? "mock-g3n", JSON.stringify(result.payloadJson ?? {}), userId ?? null, tenantId ?? null]);
    }
    async salvarTransacaoCartao(doacaoId, result, userId, tenantId) {
        await this.exec(`
        INSERT INTO captacao_transacoes_cartao (
          uuid, doacao_id, referencia_externa, status, provider_nome, payload_json, historico_json, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, CAST($6 AS JSONB), CAST($7 AS JSONB), $8, $8, $9)
        ON CONFLICT (doacao_id) DO UPDATE SET
          referencia_externa = EXCLUDED.referencia_externa,
          status = EXCLUDED.status,
          provider_nome = EXCLUDED.provider_nome,
          payload_json = EXCLUDED.payload_json,
          historico_json = EXCLUDED.historico_json,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `, [randomUUID(), doacaoId, result.externalId ?? null, result.status ?? "aguardando_pagamento", result.provider ?? "mock-g3n", JSON.stringify(result.payloadJson ?? {}), JSON.stringify([{ status: result.status ?? "aguardando_pagamento", em: new Date().toISOString() }]), userId ?? null, tenantId ?? null]);
    }
    async salvarTransacaoBoleto(doacaoId, result, userId, tenantId) {
        await this.exec(`
        INSERT INTO captacao_transacoes_boleto (
          uuid, doacao_id, numero_documento, nosso_numero, linha_digitavel, codigo_barras, data_emissao,
          data_vencimento, status, provider_nome, payload_json, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, CAST($10 AS JSONB), $11, $11, $12)
        ON CONFLICT (doacao_id) DO UPDATE SET
          numero_documento = EXCLUDED.numero_documento,
          nosso_numero = EXCLUDED.nosso_numero,
          linha_digitavel = EXCLUDED.linha_digitavel,
          codigo_barras = EXCLUDED.codigo_barras,
          data_vencimento = EXCLUDED.data_vencimento,
          status = EXCLUDED.status,
          provider_nome = EXCLUDED.provider_nome,
          payload_json = EXCLUDED.payload_json,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `, [randomUUID(), doacaoId, result.externalId ?? null, result.nossoNumero ?? null, result.linhaDigitavel ?? null, result.codigoBarras ?? null, toPgDate(String(result.dueDate ?? "")), result.status ?? "aguardando_pagamento", result.provider ?? "mock-g3n", JSON.stringify(result.payloadJson ?? {}), userId ?? null, tenantId ?? null]);
    }
    async salvarComprovante(doacaoId, data, userId, tenantId) {
        const rows = await this.query(`
        INSERT INTO captacao_comprovantes (
          uuid, doacao_id, doador_id, campanha_id, numero_comprovante, codigo_validacao, arquivo_caminho,
          mensagem_agradecimento, created_by, updated_by, tenant_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)
        ON CONFLICT (doacao_id) DO UPDATE SET
          numero_comprovante = EXCLUDED.numero_comprovante,
          codigo_validacao = EXCLUDED.codigo_validacao,
          arquivo_caminho = EXCLUDED.arquivo_caminho,
          mensagem_agradecimento = EXCLUDED.mensagem_agradecimento,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING *
      `, [data.uuid, doacaoId, data.doadorId ?? null, data.campanhaId ?? null, data.numeroComprovante, data.codigoValidacao, data.arquivoCaminho ?? null, data.mensagemAgradecimento ?? null, userId ?? null, tenantId ?? null]);
        return rows[0];
    }
    async marcarComprovanteEnviado(id, userId, tenantId) {
        await this.exec(`
        UPDATE captacao_comprovantes
           SET enviado_email = TRUE,
               data_envio_email = NOW(),
               updated_by = $2,
               updated_at = NOW()
         WHERE id = $1 AND ${tenantFilter("captacao_comprovantes", tenantId)}
      `, [id, userId ?? null]);
    }
    async buscarComprovantePorDoacao(doacaoId, tenantId) {
        const rows = await this.query(`
        SELECT c.*, d.numero_doacao, doadores.nome AS doador_nome, campanhas.nome AS campanha_nome
        FROM captacao_comprovantes c
        INNER JOIN captacao_doacoes d ON d.id = c.doacao_id
        LEFT JOIN captacao_doadores doadores ON doadores.id = c.doador_id
        LEFT JOIN captacao_campanhas campanhas ON campanhas.id = c.campanha_id
        WHERE c.doacao_id = $1 AND ${tenantFilter("c", tenantId)}
        LIMIT 1
      `, [doacaoId]);
        return rows[0];
    }
    async listarComprovantes(filters, tenantId) {
        const params = [];
        const parts = [tenantFilter("c", tenantId)];
        const pagina = Math.max(1, Number(filters.pagina ?? 1) || 1);
        const limite = Math.min(100, Math.max(1, Number(filters.limite ?? 20) || 20));
        const offset = (pagina - 1) * limite;
        const push = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        if (trimOrUndefined(String(filters.termo ?? ""))) {
            const termo = `%${trimOrUndefined(String(filters.termo))}%`;
            const param = push(termo);
            parts.push(`(c.numero_comprovante ILIKE ${param} OR COALESCE(doadores.nome, '') ILIKE ${param} OR COALESCE(campanhas.nome, '') ILIKE ${param})`);
        }
        if (trimOrUndefined(String(filters.campanhaId ?? "")))
            parts.push(`c.campanha_id = ${push(filters.campanhaId)}`);
        if (trimOrUndefined(String(filters.doadorId ?? "")))
            parts.push(`c.doador_id = ${push(filters.doadorId)}`);
        const where = parts.join(" AND ");
        const baseFrom = `
      FROM captacao_comprovantes c
      INNER JOIN captacao_doacoes d ON d.id = c.doacao_id
      LEFT JOIN captacao_doadores doadores ON doadores.id = c.doador_id
      LEFT JOIN captacao_campanhas campanhas ON campanhas.id = c.campanha_id
      WHERE ${where}
    `;
        const rows = await this.query(`
        SELECT c.*, d.numero_doacao, d.valor_liquido, d.forma_pagamento, d.data_hora, doadores.nome AS doador_nome, campanhas.nome AS campanha_nome
        ${baseFrom}
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ${push(limite)} OFFSET ${push(offset)}
      `, params);
        const countRows = await this.query(`SELECT COUNT(*)::BIGINT AS total ${baseFrom}`, params.slice(0, params.length - 2));
        return { rows, total: Number(countRows[0]?.total ?? 0) };
    }
    async obterConfiguracoes(tenantId) {
        if (tenantId) {
            await this.exec(`
          INSERT INTO captacao_configuracoes (
            tenant_id,
            modulo_habilitado,
            portal_doador_habilitado,
            campanhas_publicas_habilitadas,
            doacoes_recorrentes_habilitadas,
            envio_automatico_comprovantes
          )
          SELECT $1, TRUE, TRUE, TRUE, TRUE, TRUE
          WHERE NOT EXISTS (
            SELECT 1 FROM captacao_configuracoes WHERE tenant_id::text = $1
          )
        `, [tenantId]);
        }
        const rows = await this.query(`SELECT * FROM captacao_configuracoes WHERE ${tenantFilter("captacao_configuracoes", tenantId)} ORDER BY id ASC LIMIT 1`);
        return rows[0];
    }
    async salvarConfiguracoes(input, userId, tenantId) {
        const current = await this.obterConfiguracoes(tenantId);
        const merged = { ...(current ?? {}), ...input };
        await this.exec(`
        INSERT INTO captacao_configuracoes (
          tenant_id,
          modulo_habilitado,
          portal_doador_habilitado,
          campanhas_publicas_habilitadas,
          doacoes_recorrentes_habilitadas,
          envio_automatico_comprovantes
        )
        SELECT $1, TRUE, TRUE, TRUE, TRUE, TRUE
        WHERE NOT EXISTS (
          SELECT 1 FROM captacao_configuracoes WHERE tenant_id::text = $1
        )
      `, [tenantId ?? null]);
        const rows = await this.query(`
        UPDATE captacao_configuracoes
           SET modulo_habilitado = $1,
               portal_doador_habilitado = $2,
               campanhas_publicas_habilitadas = $3,
               doacoes_recorrentes_habilitadas = $4,
               envio_automatico_comprovantes = $5,
               pix_chave = $6,
               pix_recebedor = $7,
               pix_cidade = $8,
               pix_ambiente = $9,
               pix_webhook_url = $10,
               pix_expiracao_minutos = $11,
               pix_provider = $12,
               cartao_provider = $13,
               cartao_ambiente = $14,
               cartao_chave_publica = $15,
               cartao_chave_privada_ref = $16,
               cartao_tentativas_falha = $17,
               boleto_provider = $18,
               boleto_ambiente = $19,
               boleto_prazo_vencimento_dias = $20,
               boleto_instrucao = $21,
               mensagem_agradecimento = $22,
               modelo_comprovante = $23,
               modelo_email_cobranca = $24,
               modelo_lembrete = $25,
               modelo_campanha = $26,
               lgpd_termo_consentimento = $27,
               lgpd_politica_privacidade = $28,
               lgpd_base_legal = $29,
               updated_by = $30,
               updated_at = NOW()
         WHERE ${tenantFilter("captacao_configuracoes", tenantId)}
         RETURNING *
      `, [Boolean(merged.modulo_habilitado), Boolean(merged.portal_doador_habilitado), Boolean(merged.campanhas_publicas_habilitadas), Boolean(merged.doacoes_recorrentes_habilitadas), Boolean(merged.envio_automatico_comprovantes), merged.pix_chave ?? null, merged.pix_recebedor ?? null, merged.pix_cidade ?? null, merged.pix_ambiente ?? "sandbox", merged.pix_webhook_url ?? null, Number(merged.pix_expiracao_minutos ?? 1440), merged.pix_provider ?? "mock-g3n", merged.cartao_provider ?? "mock-g3n", merged.cartao_ambiente ?? "sandbox", merged.cartao_chave_publica ?? null, merged.cartao_chave_privada_ref ?? null, Number(merged.cartao_tentativas_falha ?? 2), merged.boleto_provider ?? "mock-g3n", merged.boleto_ambiente ?? "sandbox", Number(merged.boleto_prazo_vencimento_dias ?? 5), merged.boleto_instrucao ?? null, merged.mensagem_agradecimento ?? null, merged.modelo_comprovante ?? null, merged.modelo_email_cobranca ?? null, merged.modelo_lembrete ?? null, merged.modelo_campanha ?? null, merged.lgpd_termo_consentimento ?? null, merged.lgpd_politica_privacidade ?? null, merged.lgpd_base_legal ?? null, userId ?? null]);
        return rows[0];
    }
    async registrarLog(entidadeTipo, entidadeId, acao, descricao, detalhesJson, userId, tenantId) {
        await this.exec(`
        INSERT INTO captacao_logs (
          uuid, entidade_tipo, entidade_id, acao, descricao, detalhes_json, created_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, CAST($6 AS JSONB), $7, $8)
      `, [randomUUID(), entidadeTipo, entidadeId ?? null, acao, descricao, JSON.stringify(detalhesJson ?? {}), userId ?? null, tenantId ?? null]);
    }
    async listarLogs(limit = 200, tenantId) {
        return this.query(`SELECT * FROM captacao_logs WHERE ${tenantFilter("captacao_logs", tenantId)} ORDER BY created_at DESC, id DESC LIMIT $1`, [limit]);
    }
    async listarDashboardBase(filters, tenantId) {
        const doacoes = await this.listarDoacoes({ ...filters, pagina: 1, limite: 5000 }, tenantId);
        const campanhas = await this.listarCampanhas({ pagina: 1, limite: 5000 }, tenantId);
        const doadores = await this.listarDoadores({ pagina: 1, limite: 5000, status: "ativo" }, tenantId);
        const recorrencias = await this.query(`SELECT * FROM captacao_recorrencias WHERE deleted_at IS NULL AND ${tenantFilter("captacao_recorrencias", tenantId)} ORDER BY created_at DESC`);
        return { doacoes: doacoes.rows, campanhas: campanhas.rows, doadores: doadores.rows, recorrencias };
    }
    async obterDoadorPortalPorCredenciais(emailNorm, documentoNorm) {
        const comparadorDocumento = documentoNorm ? "AND COALESCE(d.cpf_cnpj_norm, '') = $2" : "";
        const params = documentoNorm ? [emailNorm, documentoNorm] : [emailNorm];
        const rows = await this.query(`
        SELECT *
        FROM captacao_doadores d
        WHERE d.deleted_at IS NULL
          AND d.portal_ativo = TRUE
          AND d.email_principal_norm = $1
          ${comparadorDocumento}
        LIMIT 1
      `, params);
        return rows[0];
    }
    async criarAcessoPortal(doadorId, token, metadata, userId, tenantId) {
        const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
        await this.exec(`
        INSERT INTO captacao_portal_acessos (
          uuid, doador_id, token_acesso, email_utilizado, ip_origem, user_agent, expira_em, created_by, updated_by, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
      `, [randomUUID(), doadorId, token, metadata.email ?? null, metadata.ip ?? null, metadata.userAgent ?? null, expiraEm, userId ?? null, tenantId ?? null]);
        return { token, expiraEm };
    }
    async obterAcessoPortalValido(token) {
        const rows = await this.query(`
        SELECT a.*, d.nome, d.email_principal, d.cpf_cnpj, d.id AS doador_id_real, d.tenant_id
        FROM captacao_portal_acessos a
        INNER JOIN captacao_doadores d ON d.id = a.doador_id
        WHERE a.token_acesso = $1
          AND a.ativo = TRUE
          AND a.expira_em > NOW()
          AND d.deleted_at IS NULL
        LIMIT 1
      `, [token]);
        return rows[0];
    }
    async registrarAcessoPortal(token) {
        await this.exec(`UPDATE captacao_portal_acessos SET ultimo_acesso_em = NOW(), updated_at = NOW() WHERE token_acesso = $1`, [token]);
    }
    async listarDoacoesPorDoador(doadorId, tenantId) {
        return this.query(`
        SELECT d.*, campanhas.nome AS campanha_nome
        FROM captacao_doacoes d
        LEFT JOIN captacao_campanhas campanhas ON campanhas.id = d.campanha_id
        WHERE d.doador_id = $1 AND d.deleted_at IS NULL AND ${tenantFilter("d", tenantId)}
        ORDER BY d.data_hora DESC, d.id DESC
      `, [doadorId]);
    }
    async listarRecorrenciasPorDoador(doadorId, tenantId) {
        return this.query(`
        SELECT r.*, campanhas.nome AS campanha_nome
        FROM captacao_recorrencias r
        LEFT JOIN captacao_campanhas campanhas ON campanhas.id = r.campanha_id
        WHERE r.doador_id = $1 AND r.deleted_at IS NULL AND ${tenantFilter("r", tenantId)}
        ORDER BY r.created_at DESC, r.id DESC
      `, [doadorId]);
    }
    async listarComprovantesPorDoador(doadorId, tenantId) {
        return this.query(`
        SELECT c.*, d.numero_doacao, d.valor_liquido, d.forma_pagamento, d.data_hora, campanhas.nome AS campanha_nome
        FROM captacao_comprovantes c
        INNER JOIN captacao_doacoes d ON d.id = c.doacao_id
        LEFT JOIN captacao_campanhas campanhas ON campanhas.id = c.campanha_id
        WHERE c.doador_id = $1 AND ${tenantFilter("c", tenantId)}
        ORDER BY c.created_at DESC, c.id DESC
      `, [doadorId]);
    }
    async atualizarDadosPortalDoador(doadorId, input, tenantId) {
        const rows = await this.query(`
        UPDATE captacao_doadores
           SET email_principal = COALESCE($2, email_principal),
               email_principal_norm = COALESCE($3, email_principal_norm),
               telefone = COALESCE($4, telefone),
               telefone_norm = COALESCE($5, telefone_norm),
               whatsapp = COALESCE($6, whatsapp),
               whatsapp_norm = COALESCE($7, whatsapp_norm),
               cidade = COALESCE($8, cidade),
               uf = COALESCE($9, uf),
               updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL AND ${tenantFilter("captacao_doadores", tenantId)}
         RETURNING *
      `, [doadorId, input.email ?? null, input.emailNorm ?? null, input.telefone ?? null, input.telefoneNorm ?? null, input.whatsapp ?? null, input.whatsappNorm ?? null, input.cidade ?? null, input.uf ?? null]);
        if (!rows[0])
            throw new AppError("Doador nao encontrado.", 404);
        return rows[0];
    }
    async cancelarRecorrenciaPortal(recorrenciaId, doadorId) {
        const rows = await this.query(`
        UPDATE captacao_recorrencias
           SET status = 'cancelada',
               updated_at = NOW()
         WHERE id = $1
           AND doador_id = $2
           AND deleted_at IS NULL
         RETURNING *
      `, [recorrenciaId, doadorId]);
        if (!rows[0])
            throw new AppError("Recorrencia nao encontrada.", 404);
        return rows[0];
    }
}
