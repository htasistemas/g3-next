ALTER TABLE unidade_assistencial
  ADD COLUMN IF NOT EXISTS tipo_unidade VARCHAR(30) NOT NULL DEFAULT 'ASSISTENCIAL';

UPDATE unidade_assistencial
SET tipo_unidade = 'ASSISTENCIAL'
WHERE tipo_unidade IS NULL OR tipo_unidade = '';

ALTER TABLE unidade_assistencial
  DROP CONSTRAINT IF EXISTS unidade_assistencial_tipo_unidade_check;

ALTER TABLE unidade_assistencial
  ADD CONSTRAINT unidade_assistencial_tipo_unidade_check
  CHECK (tipo_unidade IN ('ASSISTENCIAL', 'ENSINO'));

CREATE INDEX IF NOT EXISTS unidade_assistencial_tipo_unidade_idx
  ON unidade_assistencial (tipo_unidade);
