-- Evolucao incremental do cadastro de beneficiarios - parte 1.
-- Esta migration nao remove tabelas, colunas ou dados existentes.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm') THEN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pessoa (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nome_completo VARCHAR(200) NOT NULL,
  nome_social VARCHAR(200),
  data_nascimento DATE,
  nome_mae VARCHAR(200),
  nome_pai VARCHAR(200),
  cpf_normalizado VARCHAR(11),
  telefone_normalizado VARCHAR(20),
  email_normalizado VARCHAR(150),
  rg_normalizado VARCHAR(40),
  origem_cadastro VARCHAR(80) NOT NULL DEFAULT 'BENEFICIARIO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS pessoa_id BIGINT;
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS status_cadastral VARCHAR(40);
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS modo_cadastro VARCHAR(20);
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS percentual_completude INTEGER;
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS completude_calculada_em TIMESTAMP;
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS proxima_revisao_cadastral DATE;
ALTER TABLE cadastro_beneficiario ADD COLUMN IF NOT EXISTS ultima_revisao_cadastral DATE;

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS categoria VARCHAR(80);
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS hash_arquivo VARCHAR(128);
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS validade DATE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS documento_principal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS usuario_upload_id BIGINT;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS observacao TEXT;

INSERT INTO pessoa (
  tenant_id,
  nome_completo,
  nome_social,
  data_nascimento,
  nome_mae,
  nome_pai,
  cpf_normalizado,
  telefone_normalizado,
  email_normalizado,
  rg_normalizado,
  origem_cadastro,
  criado_em,
  atualizado_em
)
SELECT
  b.tenant_id,
  b.nome_completo,
  b.nome_social,
  b.data_nascimento,
  b.nome_mae,
  b.nome_pai,
  cpf.numero_documento,
  contato.telefone_principal,
  lower(nullif(trim(contato.email), '')),
  rg.numero_documento,
  'BENEFICIARIO',
  b.criado_em,
  b.atualizado_em
FROM cadastro_beneficiario b
LEFT JOIN LATERAL (
  SELECT regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g') AS numero_documento
  FROM documentos d
  WHERE d.beneficiario_id = b.id
    AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
  ORDER BY d.id DESC
  LIMIT 1
) cpf ON TRUE
LEFT JOIN LATERAL (
  SELECT regexp_replace(coalesce(d.numero_documento, ''), '[^0-9A-Za-z]', '', 'g') AS numero_documento
  FROM documentos d
  WHERE d.beneficiario_id = b.id
    AND upper(coalesce(d.tipo_documento, '')) = 'RG'
  ORDER BY d.id DESC
  LIMIT 1
) rg ON TRUE
LEFT JOIN LATERAL (
  SELECT
    regexp_replace(coalesce(c.telefone_principal, ''), '[^0-9]', '', 'g') AS telefone_principal,
    c.email
  FROM contato_beneficiario c
  WHERE c.beneficiario_id = b.id
  ORDER BY c.atualizado_em DESC, c.id DESC
  LIMIT 1
) contato ON TRUE
WHERE b.tenant_id IS NOT NULL
  AND b.pessoa_id IS NULL;

UPDATE cadastro_beneficiario b
SET pessoa_id = p.id
FROM pessoa p
WHERE b.pessoa_id IS NULL
  AND p.tenant_id = b.tenant_id
  AND p.nome_completo = b.nome_completo
  AND p.criado_em = b.criado_em;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pessoa
    WHERE cpf_normalizado IS NOT NULL AND cpf_normalizado <> ''
    GROUP BY tenant_id, cpf_normalizado
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS pessoa_tenant_cpf_uidx
      ON pessoa (tenant_id, cpf_normalizado)
      WHERE cpf_normalizado IS NOT NULL AND cpf_normalizado <> '';
  ELSE
    CREATE INDEX IF NOT EXISTS pessoa_tenant_cpf_idx
      ON pessoa (tenant_id, cpf_normalizado)
      WHERE cpf_normalizado IS NOT NULL AND cpf_normalizado <> '';
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS pessoa_tenant_nome_trgm_idx
  ON pessoa USING gin (nome_completo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS pessoa_tenant_busca_idx
  ON pessoa (tenant_id, data_nascimento, nome_mae);
CREATE INDEX IF NOT EXISTS cadastro_beneficiario_pessoa_idx
  ON cadastro_beneficiario (pessoa_id);

CREATE TABLE IF NOT EXISTS beneficiario_completude (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT NOT NULL REFERENCES cadastro_beneficiario(id) ON DELETE CASCADE,
  percentual INTEGER NOT NULL DEFAULT 0,
  status_cadastral VARCHAR(40) NOT NULL DEFAULT 'INCOMPLETO',
  pendencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  grupos JSONB NOT NULL DEFAULT '{}'::jsonb,
  recomendacao TEXT,
  calculado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS beneficiario_completude_beneficiario_uidx
  ON beneficiario_completude (beneficiario_id);
CREATE INDEX IF NOT EXISTS beneficiario_completude_tenant_idx
  ON beneficiario_completude (tenant_id, status_cadastral, percentual);

CREATE TABLE IF NOT EXISTS beneficiario_atualizacao_grupo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT NOT NULL REFERENCES cadastro_beneficiario(id) ON DELETE CASCADE,
  grupo VARCHAR(80) NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por BIGINT,
  origem_informacao VARCHAR(80) NOT NULL DEFAULT 'ATUALIZACAO_ADMINISTRATIVA',
  nivel_confirmacao VARCHAR(80) NOT NULL DEFAULT 'INFORMADO',
  revisao_prevista_em DATE,
  observacao TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS beneficiario_atualizacao_grupo_uidx
  ON beneficiario_atualizacao_grupo (beneficiario_id, grupo);

CREATE TABLE IF NOT EXISTS beneficiario_consentimento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT NOT NULL REFERENCES cadastro_beneficiario(id) ON DELETE CASCADE,
  tipo VARCHAR(80) NOT NULL,
  situacao VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  data_aceite TIMESTAMP,
  data_revogacao TIMESTAMP,
  validade DATE,
  versao_termo VARCHAR(40),
  finalidade TEXT,
  canal_coleta VARCHAR(80),
  usuario_responsavel_id BIGINT,
  responsavel_legal_nome VARCHAR(200),
  observacao TEXT,
  evidencia TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beneficiario_consentimento_tenant_idx
  ON beneficiario_consentimento (tenant_id, beneficiario_id, tipo, situacao);

CREATE TABLE IF NOT EXISTS beneficiario_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT REFERENCES cadastro_beneficiario(id) ON DELETE SET NULL,
  pessoa_id BIGINT,
  usuario_id BIGINT,
  usuario_nome VARCHAR(150),
  acao VARCHAR(80) NOT NULL,
  modulo VARCHAR(80) NOT NULL DEFAULT 'BENEFICIARIOS',
  campo_alterado VARCHAR(120),
  valor_anterior TEXT,
  valor_posterior TEXT,
  origem_alteracao VARCHAR(80) NOT NULL DEFAULT 'SISTEMA',
  endereco_ip VARCHAR(80),
  request_id VARCHAR(120),
  visibilidade VARCHAR(40) NOT NULL DEFAULT 'OPERACIONAL',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beneficiario_auditoria_tenant_idx
  ON beneficiario_auditoria (tenant_id, beneficiario_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS beneficiario_duplicidade_analise (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT REFERENCES cadastro_beneficiario(id) ON DELETE SET NULL,
  pessoa_id BIGINT,
  candidatos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  observacao TEXT,
  criado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS beneficiario_duplicidade_analise_tenant_idx
  ON beneficiario_duplicidade_analise (tenant_id, status, atualizado_em DESC);

CREATE TABLE IF NOT EXISTS beneficiario_configuracao_cadastro (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  prazo_revisao_dias INTEGER NOT NULL DEFAULT 365,
  permitir_sem_cpf BOOLEAN NOT NULL DEFAULT TRUE,
  permitir_sem_data_nascimento_completa BOOLEAN NOT NULL DEFAULT FALSE,
  permitir_sem_documento BOOLEAN NOT NULL DEFAULT TRUE,
  exigir_responsavel_menor BOOLEAN NOT NULL DEFAULT TRUE,
  exigir_familia BOOLEAN NOT NULL DEFAULT FALSE,
  ativar_analise_duplicidade BOOLEAN NOT NULL DEFAULT TRUE,
  sensibilidade_duplicidade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
  bloquear_cpf_duplicado BOOLEAN NOT NULL DEFAULT TRUE,
  ativar_alertas BOOLEAN NOT NULL DEFAULT TRUE,
  campos_obrigatorios_rapido JSONB NOT NULL DEFAULT '["nome_completo","consentimento_minimo"]'::jsonb,
  campos_obrigatorios_completo JSONB NOT NULL DEFAULT '[]'::jsonb,
  pesos_completude JSONB NOT NULL DEFAULT '{"identificacao":20,"contatos":10,"endereco":15,"familia":15,"socioeconomico":15,"documentos":10,"consentimentos":10,"programas":5}'::jsonb,
  documentos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  consentimentos_obrigatorios JSONB NOT NULL DEFAULT '["TRATAMENTO_DADOS"]'::jsonb,
  validade_documentos_dias INTEGER,
  validade_consentimentos_dias INTEGER,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integracao_configuracao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  fornecedor VARCHAR(120),
  ambiente VARCHAR(30) NOT NULL DEFAULT 'HOMOLOGACAO',
  url_base TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  tentativas INTEGER NOT NULL DEFAULT 1,
  credencial_mascarada VARCHAR(120),
  credencial_criptografada TEXT,
  limite_uso INTEGER,
  observacao TEXT,
  ultima_tentativa_em TIMESTAMP,
  ultimo_sucesso_em TIMESTAMP,
  ultimo_erro TEXT,
  atualizado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS integracao_configuracao_tenant_tipo_uidx
  ON integracao_configuracao (tenant_id, tipo);

INSERT INTO beneficiario_configuracao_cadastro (tenant_id)
SELECT DISTINCT tenant_id
FROM cadastro_beneficiario
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id) DO NOTHING;
