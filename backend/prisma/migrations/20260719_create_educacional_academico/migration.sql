CREATE TABLE IF NOT EXISTS educacional_grade_curricular (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  etapa_id BIGINT NOT NULL REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  serie_id BIGINT NOT NULL REFERENCES educacional_serie(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  aulas_semanais INTEGER NOT NULL DEFAULT 0,
  carga_horaria INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, ano_letivo_id, etapa_id, serie_id, disciplina_id)
);

CREATE TABLE IF NOT EXISTS educacional_horario (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  turma_id BIGINT NOT NULL REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  professor_id BIGINT,
  sala_id BIGINT,
  dia_semana SMALLINT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (dia_semana BETWEEN 1 AND 7),
  CHECK (hora_fim > hora_inicio)
);

CREATE INDEX IF NOT EXISTS educacional_grade_tenant_idx ON educacional_grade_curricular(tenant_id, ano_letivo_id, etapa_id, serie_id);
CREATE INDEX IF NOT EXISTS educacional_horario_tenant_idx ON educacional_horario(tenant_id, turma_id, dia_semana, hora_inicio);
CREATE INDEX IF NOT EXISTS educacional_horario_professor_idx ON educacional_horario(tenant_id, professor_id, dia_semana, hora_inicio);
CREATE INDEX IF NOT EXISTS educacional_horario_sala_idx ON educacional_horario(tenant_id, sala_id, dia_semana, hora_inicio);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_GRADE_EDITAR'),
  ('EDUCACIONAL_HORARIOS_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
