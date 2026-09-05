-- Integração segura dos cadastros existentes com pessoa.
-- Só associa CPF único dentro do tenant; CNPJ e identidades ambíguas ficam
-- sem vínculo para revisão posterior.

ALTER TABLE cadastro_profissionais ADD COLUMN IF NOT EXISTS pessoa_id BIGINT;
ALTER TABLE cadastro_voluntario ADD COLUMN IF NOT EXISTS pessoa_id BIGINT;
ALTER TABLE captacao_doadores ADD COLUMN IF NOT EXISTS pessoa_id BIGINT;

UPDATE cadastro_profissionais p
SET pessoa_id = x.id, atualizado_em = NOW()
FROM pessoa x
WHERE p.pessoa_id IS NULL
  AND p.tenant_id = x.tenant_id
  AND NULLIF(regexp_replace(COALESCE(p.cpf, ''), '[^0-9]', '', 'g'), '') = x.cpf_normalizado
  AND length(x.cpf_normalizado) = 11
  AND x.status <> 'ANONIMIZADA'
  AND NOT EXISTS (
    SELECT 1 FROM pessoa x2
    WHERE x2.tenant_id = p.tenant_id
      AND x2.cpf_normalizado = x.cpf_normalizado
      AND x2.status <> 'ANONIMIZADA'
      AND x2.id <> x.id
  );

UPDATE cadastro_voluntario v
SET pessoa_id = x.id, atualizado_em = NOW()
FROM pessoa x
WHERE v.pessoa_id IS NULL
  AND v.tenant_id = x.tenant_id
  AND NULLIF(regexp_replace(COALESCE(v.cpf, ''), '[^0-9]', '', 'g'), '') = x.cpf_normalizado
  AND length(x.cpf_normalizado) = 11
  AND x.status <> 'ANONIMIZADA'
  AND NOT EXISTS (
    SELECT 1 FROM pessoa x2
    WHERE x2.tenant_id = v.tenant_id
      AND x2.cpf_normalizado = x.cpf_normalizado
      AND x2.status <> 'ANONIMIZADA'
      AND x2.id <> x.id
  );

UPDATE captacao_doadores d
SET pessoa_id = x.id, updated_at = NOW()
FROM pessoa x
WHERE d.pessoa_id IS NULL
  AND d.tenant_id = x.tenant_id
  AND length(COALESCE(d.cpf_cnpj_norm, '')) = 11
  AND d.cpf_cnpj_norm = x.cpf_normalizado
  AND x.status <> 'ANONIMIZADA'
  AND NOT EXISTS (
    SELECT 1 FROM pessoa x2
    WHERE x2.tenant_id = d.tenant_id
      AND x2.cpf_normalizado = x.cpf_normalizado
      AND x2.status <> 'ANONIMIZADA'
      AND x2.id <> x.id
  );

CREATE INDEX IF NOT EXISTS cadastro_profissionais_tenant_pessoa_idx
  ON cadastro_profissionais (tenant_id, pessoa_id);
CREATE INDEX IF NOT EXISTS cadastro_voluntario_tenant_pessoa_idx
  ON cadastro_voluntario (tenant_id, pessoa_id);
CREATE INDEX IF NOT EXISTS captacao_doadores_tenant_pessoa_idx
  ON captacao_doadores (tenant_id, pessoa_id)
  WHERE deleted_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_profissionais_pessoa_fk') THEN
    ALTER TABLE cadastro_profissionais
      ADD CONSTRAINT cadastro_profissionais_pessoa_fk
      FOREIGN KEY (pessoa_id, tenant_id) REFERENCES pessoa (id, tenant_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cadastro_voluntario_pessoa_fk') THEN
    ALTER TABLE cadastro_voluntario
      ADD CONSTRAINT cadastro_voluntario_pessoa_fk
      FOREIGN KEY (pessoa_id, tenant_id) REFERENCES pessoa (id, tenant_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'captacao_doadores_pessoa_fk') THEN
    ALTER TABLE captacao_doadores
      ADD CONSTRAINT captacao_doadores_pessoa_fk
      FOREIGN KEY (pessoa_id, tenant_id) REFERENCES pessoa (id, tenant_id)
      ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

INSERT INTO pessoa_vinculo (tenant_id, pessoa_id, tipo_vinculo, entidade_id, principal)
SELECT p.tenant_id, p.pessoa_id, 'PROFISSIONAL', p.id, TRUE
FROM cadastro_profissionais p
WHERE p.tenant_id IS NOT NULL AND p.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO pessoa_vinculo (tenant_id, pessoa_id, tipo_vinculo, entidade_id, principal)
SELECT v.tenant_id, v.pessoa_id, 'VOLUNTARIO', v.id, TRUE
FROM cadastro_voluntario v
WHERE v.tenant_id IS NOT NULL AND v.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO pessoa_vinculo (tenant_id, pessoa_id, tipo_vinculo, entidade_id, principal)
SELECT d.tenant_id, d.pessoa_id, 'DOADOR', d.id, TRUE
FROM captacao_doadores d
WHERE d.tenant_id IS NOT NULL AND d.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;
