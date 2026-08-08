-- Configurações educacionais por tenant.
-- Migration incremental: cria tabela nova sem alterar ou remover dados existentes.

CREATE TABLE IF NOT EXISTS educacional_configuracao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  chave VARCHAR(80) NOT NULL,
  valor VARCHAR(200) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, chave)
);

CREATE INDEX IF NOT EXISTS educacional_configuracao_tenant_idx
  ON educacional_configuracao (tenant_id, ativo, chave);
