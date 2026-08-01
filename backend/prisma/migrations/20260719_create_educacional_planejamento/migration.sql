CREATE TABLE IF NOT EXISTS educacional_plano_aula (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  turma_id BIGINT NOT NULL REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  professor_id BIGINT,
  data_aula DATE,
  tema VARCHAR(240) NOT NULL,
  objetivos TEXT,
  habilidades TEXT,
  conteudo TEXT,
  metodologia TEXT,
  recursos TEXT,
  avaliacao TEXT,
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_planejamento_pedagogico (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  etapa_id BIGINT REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  turma_id BIGINT REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  responsavel_id BIGINT,
  periodo VARCHAR(40) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  objetivos TEXT,
  estrategias TEXT,
  metas TEXT,
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_plano_aula_tenant_idx ON educacional_plano_aula(tenant_id, turma_id, data_aula DESC);
CREATE INDEX IF NOT EXISTS educacional_planejamento_tenant_idx ON educacional_planejamento_pedagogico(tenant_id, ano_letivo_id, periodo);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_PLANO_AULA_EDITAR'),
  ('EDUCACIONAL_PLANEJAMENTO_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
