CREATE TABLE IF NOT EXISTS integracao_configuracao_global (
  tipo VARCHAR(80) PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  fornecedor VARCHAR(120),
  ambiente VARCHAR(30) NOT NULL DEFAULT 'HOMOLOGACAO',
  url_base TEXT,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  tentativas INTEGER NOT NULL DEFAULT 1,
  credencial_mascarada VARCHAR(120),
  credencial_criptografada TEXT,
  credencial_secundaria_mascarada VARCHAR(120),
  credencial_secundaria_criptografada TEXT,
  webhook_url TEXT,
  escopo VARCHAR(20) NOT NULL DEFAULT 'TODOS',
  limite_uso INTEGER,
  observacao TEXT,
  atualizado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO integracao_configuracao_global (
  tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
  credencial_mascarada, credencial_criptografada,
  credencial_secundaria_mascarada, credencial_secundaria_criptografada,
  webhook_url, limite_uso, observacao, atualizado_por
)
SELECT tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
       credencial_mascarada, credencial_criptografada,
       credencial_secundaria_mascarada, credencial_secundaria_criptografada,
       webhook_url, limite_uso, observacao, atualizado_por
  FROM integracao_configuracao
 WHERE tipo = 'MERCADO_PAGO'
 ORDER BY atualizado_em DESC NULLS LAST
 LIMIT 1
ON CONFLICT (tipo) DO NOTHING;

ALTER TABLE integracao_configuracao_global
  ADD COLUMN IF NOT EXISTS escopo VARCHAR(20) NOT NULL DEFAULT 'TODOS';

CREATE TABLE IF NOT EXISTS integracao_configuracao_clientes (
  tipo VARCHAR(80) NOT NULL,
  tenant_id UUID NOT NULL,
  habilitada BOOLEAN NOT NULL DEFAULT TRUE,
  atualizado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tipo, tenant_id)
);
