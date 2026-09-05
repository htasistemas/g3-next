-- Governança dos vínculos e revisão manual de duplicidades.
-- Não executa merge nem exclusão automática.

CREATE TABLE IF NOT EXISTS pessoa_vinculo_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pessoa_id BIGINT NOT NULL,
  vinculo_id BIGINT,
  usuario_id BIGINT,
  acao VARCHAR(40) NOT NULL,
  motivo TEXT,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  endereco_ip VARCHAR(80),
  request_id VARCHAR(120),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT pessoa_vinculo_auditoria_pessoa_fk
    FOREIGN KEY (pessoa_id, tenant_id) REFERENCES pessoa (id, tenant_id)
    ON DELETE RESTRICT NOT VALID
);
CREATE INDEX IF NOT EXISTS pessoa_vinculo_auditoria_tenant_idx
  ON pessoa_vinculo_auditoria (tenant_id, pessoa_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS pessoa_duplicidade_revisao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  cpf_normalizado VARCHAR(11) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
  observacao TEXT,
  usuario_id BIGINT,
  revisado_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT pessoa_duplicidade_revisao_status_ck CHECK (
    status IN ('PENDENTE', 'DIFERENTES', 'CORRIGIDA', 'CONSOLIDACAO_AUTORIZADA')
  ),
  CONSTRAINT pessoa_duplicidade_revisao_unq UNIQUE (tenant_id, cpf_normalizado)
);
CREATE INDEX IF NOT EXISTS pessoa_duplicidade_revisao_tenant_idx
  ON pessoa_duplicidade_revisao (tenant_id, status, atualizado_em DESC);
