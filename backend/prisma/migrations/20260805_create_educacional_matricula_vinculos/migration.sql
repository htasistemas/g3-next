-- Evolução incremental da matrícula escolar.
-- Mantém a matrícula existente e acrescenta os dados próprios do vínculo
-- educacional, preservando histórico por meio de movimentações.
ALTER TABLE educacional_matricula
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_encerramento DATE,
  ADD COLUMN IF NOT EXISTS turno VARCHAR(30),
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS usuario_responsavel_id BIGINT,
  ADD COLUMN IF NOT EXISTS usuario_responsavel_nome VARCHAR(200),
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE educacional_matricula
SET data_inicio = COALESCE(data_inicio, data_matricula),
    ativo = COALESCE(ativo, situacao IN ('ATIVA', 'PENDENTE'))
WHERE data_inicio IS NULL OR ativo IS NULL;

CREATE TABLE IF NOT EXISTS educacional_matricula_movimentacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  matricula_origem_id BIGINT NOT NULL REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  matricula_destino_id BIGINT REFERENCES educacional_matricula(id) ON DELETE RESTRICT,
  tipo VARCHAR(40) NOT NULL,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT,
  observacoes TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_responsavel_id BIGINT,
  usuario_responsavel_nome VARCHAR(200),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_matricula_vinculo_idx
  ON educacional_matricula (tenant_id, unidade_id, sala_id, ano_letivo_id, situacao, ativo);
CREATE INDEX IF NOT EXISTS educacional_matricula_aluno_idx
  ON educacional_matricula (tenant_id, aluno_id, data_inicio DESC);
CREATE INDEX IF NOT EXISTS educacional_matricula_movimentacao_idx
  ON educacional_matricula_movimentacao (tenant_id, matricula_origem_id, criado_em DESC);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_ALUNO_VINCULO_EDITAR'),
  ('EDUCACIONAL_ALUNO_TRANSFERIR'),
  ('EDUCACIONAL_ALUNO_HISTORICO_VISUALIZAR'),
  ('EDUCACIONAL_ALUNO_RELATORIO_EXPORTAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
