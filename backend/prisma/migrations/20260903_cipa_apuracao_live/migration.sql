-- Fase operacional: zerésima, apuração persistida e snapshot mínimo para desempate.
ALTER TABLE cipa_candidatura ADD COLUMN IF NOT EXISTS data_admissao_estabelecimento DATE;

CREATE TABLE IF NOT EXISTS cipa_eleicao_zeresima (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  votos_iniciais INTEGER NOT NULL DEFAULT 0,
  integridade_hash VARCHAR(128) NOT NULL,
  gerada_por BIGINT NOT NULL,
  gerada_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_zeresima_eleicao_unq UNIQUE (tenant_id, eleicao_id),
  CONSTRAINT cipa_zeresima_votos_ck CHECK (votos_iniciais = 0)
);

CREATE TABLE IF NOT EXISTS cipa_eleicao_apuracao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  total_eleitores INTEGER NOT NULL,
  total_votos INTEGER NOT NULL,
  total_participantes INTEGER NOT NULL,
  votos_validos INTEGER NOT NULL,
  votos_brancos INTEGER NOT NULL,
  votos_nulos INTEGER NOT NULL,
  participacao_percentual NUMERIC(7,4) NOT NULL,
  resultado_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  criterios_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  integridade_hash VARCHAR(128) NOT NULL,
  apurada_por BIGINT NOT NULL,
  apurada_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_apuracao_eleicao_unq UNIQUE (tenant_id, eleicao_id),
  CONSTRAINT cipa_apuracao_totais_ck CHECK (total_eleitores >= 0 AND total_votos >= 0 AND total_participantes >= 0 AND votos_validos >= 0 AND votos_brancos >= 0 AND votos_nulos >= 0),
  CONSTRAINT cipa_apuracao_percentual_ck CHECK (participacao_percentual >= 0 AND participacao_percentual <= 100)
);

CREATE INDEX IF NOT EXISTS cipa_zeresima_tenant_eleicao_idx ON cipa_eleicao_zeresima (tenant_id, eleicao_id, gerada_em DESC);
CREATE INDEX IF NOT EXISTS cipa_apuracao_tenant_eleicao_idx ON cipa_eleicao_apuracao (tenant_id, eleicao_id, apurada_em DESC);
