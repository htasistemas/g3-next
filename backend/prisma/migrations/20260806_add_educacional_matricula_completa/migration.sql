-- Complemento incremental da matrícula escolar.
-- Não remove dados existentes; apenas adiciona campos administrativos opcionais.

ALTER TABLE educacional_matricula
  ADD COLUMN IF NOT EXISTS origem VARCHAR(40) NOT NULL DEFAULT 'NOVO',
  ADD COLUMN IF NOT EXISTS escola_anterior VARCHAR(200),
  ADD COLUMN IF NOT EXISTS responsavel_id BIGINT,
  ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(200),
  ADD COLUMN IF NOT EXISTS transporte_escolar BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS transporte_descricao TEXT,
  ADD COLUMN IF NOT EXISTS documentacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS informacoes_complementares TEXT;

CREATE INDEX IF NOT EXISTS educacional_matricula_origem_idx
  ON educacional_matricula (tenant_id, origem, ano_letivo_id);
CREATE INDEX IF NOT EXISTS educacional_matricula_responsavel_idx
  ON educacional_matricula (tenant_id, responsavel_id);
