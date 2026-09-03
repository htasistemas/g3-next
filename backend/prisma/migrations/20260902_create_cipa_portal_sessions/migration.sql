-- Sessoes opacas e expiraveis dos portais CIPA. O token bruto nunca e persistido.
CREATE TABLE IF NOT EXISTS cipa_portal_sessao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  colaborador_id BIGINT NOT NULL REFERENCES rh_colaborador(id) ON DELETE RESTRICT,
  finalidade VARCHAR(20) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP NOT NULL,
  usado_em TIMESTAMP,
  revogado_em TIMESTAMP,
  CONSTRAINT cipa_portal_sessao_finalidade_ck CHECK (finalidade IN ('CANDIDATURA', 'VOTACAO')),
  CONSTRAINT cipa_portal_sessao_token_unq UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS cipa_portal_sessao_lookup_idx
  ON cipa_portal_sessao (token_hash, finalidade, expira_em);
CREATE INDEX IF NOT EXISTS cipa_portal_sessao_tenant_eleicao_idx
  ON cipa_portal_sessao (tenant_id, eleicao_id, finalidade, criado_em DESC);
