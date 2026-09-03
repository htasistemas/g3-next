-- Rodadas de extensão da votação para participação mínima, mantendo a regra configurável e auditável.
ALTER TABLE cipa_eleicao ADD COLUMN IF NOT EXISTS extensao_numero INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cipa_eleicao ADD COLUMN IF NOT EXISTS ultima_extensao_em TIMESTAMP;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cipa_eleicao_extensao_numero_ck') THEN
    ALTER TABLE cipa_eleicao ADD CONSTRAINT cipa_eleicao_extensao_numero_ck CHECK (extensao_numero >= 0);
  END IF;
END $$;
