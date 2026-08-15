-- Garante que salas possam ser inativadas sem apagar o histórico educacional.
ALTER TABLE salas_unidade
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS salas_unidade_ativo_idx
  ON salas_unidade (unidade_id, ativo, id);
