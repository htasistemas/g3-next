-- Corrige beneficiarios legados de producao que ficaram fora do tenant autenticado.
-- Mantem isolamento multitenant: apenas registros sem tenant, base com um unico tenant
-- ou codigos demonstrativos Torresoft sao reassociados.

DO $$
DECLARE
  tenant_torresoft UUID;
  total_torresoft INTEGER;
  total_instituicoes INTEGER;
  tenant_unico UUID;
BEGIN
  ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS contato_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS documentos ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS situacao_social ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS escolaridade_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS saude_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS beneficios_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;
  ALTER TABLE IF EXISTS observacoes_beneficiario ADD COLUMN IF NOT EXISTS tenant_id UUID;

  SELECT tenant_id
    INTO tenant_torresoft
  FROM instituicoes
  WHERE regexp_replace(coalesce(cnpj, ''), '\D', '', 'g') = '32004110000118'
     OR lower(coalesce(slug, '')) = 'torresoft'
     OR upper(coalesce(codigo, '')) = 'TORRESOFT'
  ORDER BY atualizado_em DESC
  LIMIT 1;

  SELECT COUNT(*)
    INTO total_instituicoes
  FROM instituicoes;

  SELECT tenant_id
    INTO tenant_unico
  FROM instituicoes
  ORDER BY criado_em ASC
  LIMIT 1;

  IF total_instituicoes = 1 AND tenant_unico IS NOT NULL THEN
    UPDATE cadastro_beneficiario
       SET tenant_id = tenant_unico
     WHERE tenant_id IS NULL;
  END IF;

  IF tenant_torresoft IS NOT NULL THEN
    SELECT COUNT(*)
      INTO total_torresoft
    FROM cadastro_beneficiario
    WHERE tenant_id = tenant_torresoft;

    IF total_torresoft = 0 THEN
      UPDATE cadastro_beneficiario
         SET tenant_id = tenant_torresoft
       WHERE tenant_id IS NULL
          OR codigo ILIKE 'DEMO-TS-BEN-%'
          OR codigo ILIKE 'DEMO-TS-AUTO-BEN-%';
    ELSE
      UPDATE cadastro_beneficiario
         SET tenant_id = tenant_torresoft
       WHERE tenant_id IS NULL
         AND (
           codigo ILIKE 'DEMO-TS-BEN-%'
           OR codigo ILIKE 'DEMO-TS-AUTO-BEN-%'
         );
    END IF;
  END IF;

  UPDATE contato_beneficiario c
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE c.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND c.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE documentos d
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE d.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND d.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE situacao_social s
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE s.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND s.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE escolaridade_beneficiario e
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE e.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND e.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE saude_beneficiario s
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE s.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND s.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE beneficios_beneficiario bb
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE bb.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND bb.tenant_id IS DISTINCT FROM b.tenant_id;

  UPDATE observacoes_beneficiario o
     SET tenant_id = b.tenant_id
    FROM cadastro_beneficiario b
   WHERE o.beneficiario_id = b.id
     AND b.tenant_id IS NOT NULL
     AND o.tenant_id IS DISTINCT FROM b.tenant_id;

  CREATE INDEX IF NOT EXISTS cadastro_beneficiario_tenant_nome_idx
    ON cadastro_beneficiario(tenant_id, nome_completo);
END
$$;
