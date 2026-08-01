CREATE TABLE IF NOT EXISTS educacional_rotina_infantil (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  data_rotina DATE NOT NULL,
  alimentacao VARCHAR(80),
  sono_inicio TIME,
  sono_fim TIME,
  higiene TEXT,
  trocas INTEGER,
  medicacao_autorizada TEXT,
  humor VARCHAR(60),
  atividades TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, aluno_id, data_rotina)
);

CREATE TABLE IF NOT EXISTS educacional_desenvolvimento_infantil (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  periodo VARCHAR(40) NOT NULL,
  area VARCHAR(60) NOT NULL,
  avaliacao VARCHAR(80) NOT NULL,
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_rotina_tenant_idx ON educacional_rotina_infantil(tenant_id, aluno_id, data_rotina DESC);
CREATE INDEX IF NOT EXISTS educacional_desenvolvimento_tenant_idx ON educacional_desenvolvimento_infantil(tenant_id, aluno_id, periodo);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_ROTINA_INFANTIL_EDITAR'),
  ('EDUCACIONAL_DESENVOLVIMENTO_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
