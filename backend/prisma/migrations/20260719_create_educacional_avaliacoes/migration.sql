CREATE TABLE IF NOT EXISTS educacional_avaliacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  turma_id BIGINT NOT NULL REFERENCES educacional_turma(id) ON DELETE RESTRICT,
  disciplina_id BIGINT NOT NULL REFERENCES educacional_disciplina(id) ON DELETE RESTRICT,
  periodo VARCHAR(40) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  data_avaliacao DATE,
  valor_maximo NUMERIC(8,2) NOT NULL DEFAULT 10,
  peso NUMERIC(8,2) NOT NULL DEFAULT 1,
  descricao TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ABERTA',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_nota (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  avaliacao_id BIGINT NOT NULL REFERENCES educacional_avaliacao(id) ON DELETE CASCADE,
  matricula_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  valor NUMERIC(8,2),
  conceito VARCHAR(20),
  observacao TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, avaliacao_id, matricula_id),
  CHECK (valor IS NULL OR valor >= 0)
);

CREATE INDEX IF NOT EXISTS educacional_avaliacao_tenant_idx ON educacional_avaliacao(tenant_id, turma_id, periodo, data_avaliacao);
CREATE INDEX IF NOT EXISTS educacional_nota_tenant_idx ON educacional_nota(tenant_id, matricula_id, avaliacao_id);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_AVALIACOES_EDITAR'),
  ('EDUCACIONAL_NOTAS_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
