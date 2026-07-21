CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS importacao_dados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(40) NOT NULL,
  tenant_id UUID NOT NULL,
  instituicao_id UUID NOT NULL,
  instituicao_nome VARCHAR(200) NOT NULL,
  instituicao_cnpj VARCHAR(20) NOT NULL,
  usuario_master_id BIGINT,
  usuario_master_nome VARCHAR(200) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL,
  total_registros INTEGER NOT NULL DEFAULT 0,
  prontos INTEGER NOT NULL DEFAULT 0,
  existentes INTEGER NOT NULL DEFAULT 0,
  duplicidades INTEGER NOT NULL DEFAULT 0,
  erros INTEGER NOT NULL DEFAULT 0,
  ignorados INTEGER NOT NULL DEFAULT 0,
  mapeamento JSONB NOT NULL DEFAULT '{}'::jsonb,
  linhas JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS importacao_dados_tenant_idx ON importacao_dados(tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS importacao_dados_status_idx ON importacao_dados(status, criado_em DESC);
