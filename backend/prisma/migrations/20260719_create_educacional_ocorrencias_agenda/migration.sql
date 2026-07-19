CREATE TABLE IF NOT EXISTS educacional_ocorrencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  matricula_id BIGINT REFERENCES educacional_matricula(id) ON DELETE SET NULL,
  data_ocorrencia DATE NOT NULL,
  hora_ocorrencia TIME,
  tipo VARCHAR(60) NOT NULL,
  descricao TEXT NOT NULL,
  providencias TEXT,
  responsavel_comunicado BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'ABERTA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_agenda (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  unidade_id BIGINT,
  turma_id BIGINT REFERENCES educacional_turma(id) ON DELETE SET NULL,
  aluno_id BIGINT REFERENCES educacional_aluno(id) ON DELETE SET NULL,
  data_inicio TIMESTAMP NOT NULL,
  data_fim TIMESTAMP,
  tipo VARCHAR(60) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  descricao TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_ocorrencia_tenant_idx ON educacional_ocorrencia(tenant_id, aluno_id, data_ocorrencia DESC);
CREATE INDEX IF NOT EXISTS educacional_agenda_tenant_idx ON educacional_agenda(tenant_id, data_inicio, tipo);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_OCORRENCIAS_EDITAR'),
  ('EDUCACIONAL_AGENDA_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
