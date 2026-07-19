CREATE TABLE IF NOT EXISTS educacional_boletim (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  periodo VARCHAR(40) NOT NULL,
  media NUMERIC(8,2),
  frequencia NUMERIC(8,2),
  resultado VARCHAR(40),
  observacoes TEXT,
  emitido_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, matricula_id, ano_letivo_id, periodo)
);

CREATE TABLE IF NOT EXISTS educacional_historico_escolar (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  escola_descricao VARCHAR(240),
  etapa_descricao VARCHAR(160),
  serie_descricao VARCHAR(160),
  media NUMERIC(8,2),
  frequencia NUMERIC(8,2),
  resultado VARCHAR(40) NOT NULL,
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, aluno_id, ano_letivo_id)
);

CREATE INDEX IF NOT EXISTS educacional_boletim_tenant_idx ON educacional_boletim(tenant_id, matricula_id, ano_letivo_id, periodo);
CREATE INDEX IF NOT EXISTS educacional_historico_tenant_idx ON educacional_historico_escolar(tenant_id, aluno_id, ano_letivo_id);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_BOLETIM_EDITAR'),
  ('EDUCACIONAL_HISTORICO_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
