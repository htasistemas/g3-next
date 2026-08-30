CREATE TABLE IF NOT EXISTS carteira_evento_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  evento_id BIGINT,
  participante_id BIGINT,
  venda_id BIGINT,
  tipo_evento VARCHAR(60) NOT NULL,
  descricao TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  usuario_id BIGINT,
  usuario_nome VARCHAR(180),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carteira_evento_auditoria_tenant_idx
  ON carteira_evento_auditoria (tenant_id, criado_em DESC, id DESC);

CREATE INDEX IF NOT EXISTS carteira_evento_auditoria_evento_idx
  ON carteira_evento_auditoria (evento_id, criado_em DESC, id DESC);

CREATE INDEX IF NOT EXISTS carteira_evento_auditoria_venda_idx
  ON carteira_evento_auditoria (venda_id, criado_em DESC, id DESC);

ALTER TABLE IF EXISTS carteira_evento_venda
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDA';

ALTER TABLE IF EXISTS carteira_evento_venda
  ADD COLUMN IF NOT EXISTS estornada_em TIMESTAMP;

ALTER TABLE IF EXISTS carteira_evento_venda
  ADD COLUMN IF NOT EXISTS estorno_motivo TEXT;

CREATE TABLE IF NOT EXISTS carteira_evento_caixa_movimentacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  evento_id BIGINT NOT NULL,
  barraca_id BIGINT,
  venda_id BIGINT,
  tipo VARCHAR(40) NOT NULL,
  forma_pagamento VARCHAR(40),
  valor NUMERIC(14,2) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  operador_usuario_id BIGINT,
  operador_nome VARCHAR(180),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS carteira_evento_caixa_venda_tipo_unq
  ON carteira_evento_caixa_movimentacao(venda_id, tipo) WHERE venda_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS carteira_evento_caixa_evento_idx
  ON carteira_evento_caixa_movimentacao(tenant_id, evento_id, criado_em DESC);
