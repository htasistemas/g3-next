CREATE TABLE IF NOT EXISTS educacional_lista_espera (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  beneficiario_id BIGINT,
  aluno_id BIGINT REFERENCES educacional_aluno(id) ON DELETE SET NULL,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  unidade_id BIGINT,
  etapa_id BIGINT NOT NULL REFERENCES educacional_etapa(id) ON DELETE RESTRICT,
  serie_id BIGINT NOT NULL REFERENCES educacional_serie(id) ON DELETE RESTRICT,
  turno VARCHAR(30) NOT NULL,
  prioridade INTEGER NOT NULL DEFAULT 0,
  data_inscricao DATE NOT NULL DEFAULT CURRENT_DATE,
  situacao VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO',
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_recuperacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  periodo VARCHAR(40) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  valor_maximo NUMERIC(8,2) NOT NULL DEFAULT 10,
  valor NUMERIC(8,2),
  conceito VARCHAR(20),
  resultado VARCHAR(80),
  status VARCHAR(30) NOT NULL DEFAULT 'ABERTA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (valor IS NULL OR (valor >= 0 AND valor <= valor_maximo))
);

CREATE TABLE IF NOT EXISTS educacional_resultado_final (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  situacao VARCHAR(60) NOT NULL,
  media NUMERIC(8,2),
  frequencia NUMERIC(5,2),
  observacoes TEXT,
  data_resultado DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, matricula_id, ano_letivo_id),
  CHECK (media IS NULL OR media >= 0),
  CHECK (frequencia IS NULL OR (frequencia >= 0 AND frequencia <= 100))
);

CREATE TABLE IF NOT EXISTS educacional_calendario (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ano_letivo_id BIGINT NOT NULL REFERENCES educacional_ano_letivo(id) ON DELETE RESTRICT,
  unidade_id BIGINT,
  data_evento DATE NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  descricao TEXT,
  dia_letivo BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_lista_espera_tenant_idx ON educacional_lista_espera(tenant_id, ano_letivo_id, situacao, prioridade DESC);
CREATE INDEX IF NOT EXISTS educacional_recuperacao_tenant_idx ON educacional_recuperacao(tenant_id, matricula_id, periodo);
CREATE INDEX IF NOT EXISTS educacional_resultado_final_tenant_idx ON educacional_resultado_final(tenant_id, ano_letivo_id, situacao);
CREATE INDEX IF NOT EXISTS educacional_calendario_tenant_idx ON educacional_calendario(tenant_id, ano_letivo_id, data_evento);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_LISTA_ESPERA'),
  ('EDUCACIONAL_RECUPERACAO'),
  ('EDUCACIONAL_RESULTADO_FINAL'),
  ('EDUCACIONAL_CALENDARIO')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
