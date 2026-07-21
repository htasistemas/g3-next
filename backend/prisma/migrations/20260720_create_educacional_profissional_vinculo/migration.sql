CREATE TABLE IF NOT EXISTS educacional_profissional_vinculo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  profissional_id BIGINT NOT NULL REFERENCES cadastro_profissionais(id) ON DELETE RESTRICT,
  funcao VARCHAR(120) NOT NULL,
  unidade_id BIGINT REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
  disciplina_id BIGINT REFERENCES educacional_disciplina(id) ON DELETE SET NULL,
  turma_id BIGINT REFERENCES educacional_turma(id) ON DELETE SET NULL,
  carga_horaria INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS educacional_profissional_vinculo_ativo_uq
  ON educacional_profissional_vinculo (tenant_id, profissional_id, funcao)
  WHERE status = 'ATIVO';
CREATE INDEX IF NOT EXISTS educacional_profissional_vinculo_tenant_idx
  ON educacional_profissional_vinculo (tenant_id, profissional_id, status);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES ('EDUCACIONAL_PROFISSIONAIS_VISUALIZAR'), ('EDUCACIONAL_PROFISSIONAIS_EDITAR'), ('EDUCACIONAL_DOCUMENTOS_VISUALIZAR')) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
