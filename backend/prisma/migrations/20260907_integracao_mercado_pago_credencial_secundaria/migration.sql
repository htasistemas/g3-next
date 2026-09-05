ALTER TABLE integracao_configuracao
  ADD COLUMN IF NOT EXISTS credencial_secundaria_mascarada VARCHAR(120),
  ADD COLUMN IF NOT EXISTS credencial_secundaria_criptografada TEXT,
  ADD COLUMN IF NOT EXISTS webhook_url TEXT;
