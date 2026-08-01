ALTER TABLE salas_unidade
  ADD COLUMN IF NOT EXISTS capacidade_maxima INTEGER NOT NULL DEFAULT 0;

ALTER TABLE salas_unidade
  DROP CONSTRAINT IF EXISTS salas_unidade_capacidade_maxima_check;

ALTER TABLE salas_unidade
  ADD CONSTRAINT salas_unidade_capacidade_maxima_check
  CHECK (capacidade_maxima >= 0);

ALTER TABLE educacional_matricula
  ADD COLUMN IF NOT EXISTS sala_id BIGINT REFERENCES salas_unidade(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS educacional_matricula_unidade_sala_idx
  ON educacional_matricula (tenant_id, unidade_id, sala_id, situacao);
