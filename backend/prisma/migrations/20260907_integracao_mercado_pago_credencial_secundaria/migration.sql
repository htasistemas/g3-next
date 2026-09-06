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

ALTER TABLE integracao_configuracao
  ADD COLUMN IF NOT EXISTS credencial_secundaria_mascarada VARCHAR(120),
  ADD COLUMN IF NOT EXISTS credencial_secundaria_criptografada TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;
