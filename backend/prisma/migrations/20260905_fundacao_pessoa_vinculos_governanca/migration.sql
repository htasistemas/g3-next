-- Fase 3: fundação corporativa de identidade e vínculos.
-- Migration incremental: não remove dados, não mescla pessoas e não altera
-- automaticamente registros com identidade ambígua.

-- Permite validar também o tenant em chaves estrangeiras compostas.
CREATE UNIQUE INDEX IF NOT EXISTS pessoa_id_tenant_uidx
  ON pessoa (id, tenant_id);

ALTER TABLE pessoa
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN IF NOT EXISTS anonimizada_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS anonimizada_por BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pessoa_status_ck'
  ) THEN
    ALTER TABLE pessoa
      ADD CONSTRAINT pessoa_status_ck
      CHECK (status IN ('ATIVA', 'INATIVA', 'ANONIMIZADA'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pessoa_vinculo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  pessoa_id BIGINT NOT NULL,
  tipo_vinculo VARCHAR(40) NOT NULL,
  entidade_id BIGINT,
  identificador_externo VARCHAR(120),
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  inicio_em DATE,
  fim_em DATE,
  metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT pessoa_vinculo_tipo_ck CHECK (
    tipo_vinculo IN (
      'BENEFICIARIO', 'COLABORADOR', 'PROFISSIONAL', 'VOLUNTARIO',
      'DOADOR', 'USUARIO', 'RESPONSAVEL', 'OUTRO'
    )
  ),
  CONSTRAINT pessoa_vinculo_periodo_ck CHECK (
    fim_em IS NULL OR inicio_em IS NULL OR fim_em >= inicio_em
  ),
  CONSTRAINT pessoa_vinculo_pessoa_fk
    FOREIGN KEY (pessoa_id, tenant_id)
    REFERENCES pessoa (id, tenant_id)
    ON DELETE RESTRICT
    NOT VALID
);

CREATE UNIQUE INDEX IF NOT EXISTS pessoa_vinculo_referencia_uidx
  ON pessoa_vinculo (
    tenant_id,
    pessoa_id,
    tipo_vinculo,
    COALESCE(entidade_id, 0),
    COALESCE(identificador_externo, '')
  );
CREATE INDEX IF NOT EXISTS pessoa_vinculo_tenant_tipo_idx
  ON pessoa_vinculo (tenant_id, tipo_vinculo, ativo, pessoa_id);
CREATE INDEX IF NOT EXISTS pessoa_vinculo_pessoa_idx
  ON pessoa_vinculo (tenant_id, pessoa_id, ativo);

ALTER TABLE rh_colaborador
  ADD COLUMN IF NOT EXISTS pessoa_id BIGINT;

-- Associação automática somente quando houver uma única pessoa com o mesmo
-- CPF normalizado no tenant. Duplicidades permanecem sem associação para
-- revisão humana.
UPDATE rh_colaborador c
SET pessoa_id = p.id,
    atualizado_em = NOW()
FROM pessoa p
WHERE c.pessoa_id IS NULL
  AND c.tenant_id = p.tenant_id
  AND c.cpf = p.cpf_normalizado
  AND p.status <> 'ANONIMIZADA'
  AND NOT EXISTS (
    SELECT 1
    FROM pessoa p2
    WHERE p2.tenant_id = c.tenant_id
      AND p2.cpf_normalizado = c.cpf
      AND p2.status <> 'ANONIMIZADA'
      AND p2.id <> p.id
  );

CREATE INDEX IF NOT EXISTS rh_colaborador_tenant_pessoa_idx
  ON rh_colaborador (tenant_id, pessoa_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rh_colaborador_pessoa_fk'
  ) THEN
    ALTER TABLE rh_colaborador
      ADD CONSTRAINT rh_colaborador_pessoa_fk
      FOREIGN KEY (pessoa_id, tenant_id)
      REFERENCES pessoa (id, tenant_id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

-- Beneficiários já foram vinculados pela migration de evolução cadastral.
-- A constraint é adicionada como NOT VALID para preservar eventual legado
-- inconsistente e bloquear novas associações entre tenants diferentes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cadastro_beneficiario_pessoa_fk'
  ) THEN
    ALTER TABLE cadastro_beneficiario
      ADD CONSTRAINT cadastro_beneficiario_pessoa_fk
      FOREIGN KEY (pessoa_id, tenant_id)
      REFERENCES pessoa (id, tenant_id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

-- Vínculos derivados dos cadastros existentes. Não duplica registros.
INSERT INTO pessoa_vinculo (tenant_id, pessoa_id, tipo_vinculo, entidade_id, principal)
SELECT b.tenant_id, b.pessoa_id, 'BENEFICIARIO', b.id, TRUE
FROM cadastro_beneficiario b
WHERE b.tenant_id IS NOT NULL
  AND b.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO pessoa_vinculo (tenant_id, pessoa_id, tipo_vinculo, entidade_id, principal)
SELECT c.tenant_id, c.pessoa_id, 'COLABORADOR', c.id, TRUE
FROM rh_colaborador c
WHERE c.tenant_id IS NOT NULL
  AND c.pessoa_id IS NOT NULL
ON CONFLICT DO NOTHING;
