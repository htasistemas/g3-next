CREATE TABLE IF NOT EXISTS educacional_diario_aula (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  turma_id BIGINT NOT NULL REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  professor_id BIGINT,
  data_aula DATE NOT NULL,
  conteudo TEXT,
  objetivos TEXT,
  metodologia TEXT,
  atividades TEXT,
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, turma_id, disciplina_id, data_aula)
);

CREATE TABLE IF NOT EXISTS educacional_frequencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  diario_aula_id BIGINT NOT NULL REFERENCES educacional_diario_aula(id) ON DELETE CASCADE,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  situacao VARCHAR(20) NOT NULL DEFAULT 'PRESENTE',
  justificativa TEXT,
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, diario_aula_id, matricula_id),
  CHECK (situacao IN ('PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'ATRASO', 'SAIDA_ANTECIPADA'))
);

CREATE INDEX IF NOT EXISTS educacional_diario_tenant_idx ON educacional_diario_aula(tenant_id, turma_id, data_aula DESC);
CREATE INDEX IF NOT EXISTS educacional_frequencia_tenant_idx ON educacional_frequencia(tenant_id, matricula_id, criado_em DESC);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_DIARIO_EDITAR'),
  ('EDUCACIONAL_FREQUENCIA_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
