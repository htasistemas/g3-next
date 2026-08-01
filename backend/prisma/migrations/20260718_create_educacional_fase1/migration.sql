CREATE TABLE IF NOT EXISTS educacional_ano_letivo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ano INTEGER NOT NULL,
  descricao VARCHAR(160) NOT NULL,
  data_inicial DATE,
  data_final DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PLANEJAMENTO',
  periodos JSONB NOT NULL DEFAULT '[]'::jsonb,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, ano)
);

CREATE TABLE IF NOT EXISTS educacional_etapa (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS educacional_serie (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  etapa_id BIGINT NOT NULL REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  nome VARCHAR(160) NOT NULL,
  descricao TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, etapa_id, nome)
);

CREATE TABLE IF NOT EXISTS educacional_disciplina (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  codigo VARCHAR(40),
  nome VARCHAR(160) NOT NULL,
  area VARCHAR(120),
  carga_horaria INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE IF NOT EXISTS educacional_turma (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  unidade_id BIGINT,
  etapa_id BIGINT NOT NULL REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  serie_id BIGINT NOT NULL REFERENCES educacional_serie(id) ON DELETE RESTRICT,
  sala_id BIGINT,
  nome VARCHAR(120) NOT NULL,
  turno VARCHAR(30) NOT NULL DEFAULT 'INTEGRAL',
  capacidade_maxima INTEGER NOT NULL DEFAULT 0,
  professor_responsavel_id BIGINT,
  professor_responsavel_nome VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, ano_letivo_id, nome)
);

CREATE TABLE IF NOT EXISTS educacional_aluno (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT NOT NULL,
  numero_aluno VARCHAR(40),
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, beneficiario_id),
  UNIQUE (tenant_id, numero_aluno)
);

CREATE TABLE IF NOT EXISTS educacional_matricula (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  unidade_id BIGINT,
  etapa_id BIGINT NOT NULL REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  serie_id BIGINT NOT NULL REFERENCES educacional_serie(id) ON DELETE RESTRICT,
  turma_id BIGINT REFERENCES educacional_turma(id) ON DELETE SET NULL,
  numero_matricula VARCHAR(60) NOT NULL,
  data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
  situacao VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, numero_matricula),
  UNIQUE (tenant_id, aluno_id, ano_letivo_id)
);

CREATE TABLE IF NOT EXISTS educacional_enturmacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE CASCADE,
  turma_id BIGINT NOT NULL REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  motivo TEXT,
  usuario_id BIGINT,
  usuario_nome VARCHAR(200),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entidade VARCHAR(80) NOT NULL,
  entidade_id BIGINT,
  acao VARCHAR(40) NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_id BIGINT,
  usuario_nome VARCHAR(200),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_ano_tenant_idx ON educacional_ano_letivo(tenant_id, ano);
CREATE INDEX IF NOT EXISTS educacional_etapa_tenant_idx ON educacional_etapa(tenant_id, nome);
CREATE INDEX IF NOT EXISTS educacional_serie_tenant_idx ON educacional_serie(tenant_id, etapa_id, nome);
CREATE INDEX IF NOT EXISTS educacional_disciplina_tenant_idx ON educacional_disciplina(tenant_id, nome);
CREATE INDEX IF NOT EXISTS educacional_turma_tenant_idx ON educacional_turma(tenant_id, ano_letivo_id, status);
CREATE INDEX IF NOT EXISTS educacional_aluno_tenant_idx ON educacional_aluno(tenant_id, beneficiario_id);
CREATE INDEX IF NOT EXISTS educacional_matricula_tenant_idx ON educacional_matricula(tenant_id, ano_letivo_id, situacao);
CREATE INDEX IF NOT EXISTS educacional_enturmacao_tenant_idx ON educacional_enturmacao(tenant_id, matricula_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS educacional_auditoria_tenant_idx ON educacional_auditoria(tenant_id, entidade, entidade_id, criado_em DESC);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_VISUALIZAR'),
  ('EDUCACIONAL_ESTRUTURA_EDITAR'),
  ('EDUCACIONAL_MATRICULAS_VISUALIZAR'),
  ('EDUCACIONAL_MATRICULAS_EDITAR'),
  ('EDUCACIONAL_ENTURMACAO_EDITAR'),
  ('EDUCACIONAL_RELATORIOS_VISUALIZAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
