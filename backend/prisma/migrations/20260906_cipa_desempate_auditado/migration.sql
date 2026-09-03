CREATE TABLE IF NOT EXISTS cipa_eleicao_desempate (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  candidatura_id BIGINT NOT NULL REFERENCES cipa_candidatura(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL,
  criterio VARCHAR(60) NOT NULL,
  justificativa TEXT NOT NULL,
  usuario_id BIGINT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_desempate_ordem_ck CHECK (ordem > 0),
  CONSTRAINT cipa_desempate_criterio_ck CHECK (criterio IN ('TEMPO_SERVICO_ESTABELECIMENTO', 'SORTEIO_AUDITADO', 'REGRA_CUSTOMIZADA')),
  CONSTRAINT cipa_desempate_candidato_unq UNIQUE (tenant_id, eleicao_id, candidatura_id),
  CONSTRAINT cipa_desempate_ordem_unq UNIQUE (tenant_id, eleicao_id, ordem)
);

CREATE INDEX IF NOT EXISTS cipa_desempate_tenant_eleicao_idx
  ON cipa_eleicao_desempate (tenant_id, eleicao_id, ordem);
