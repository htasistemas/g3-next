-- Vinculo opcional entre o instrumento profissional e o cadastro de Termo de Fomento.
-- Evolucao incremental: nao remove dados nem altera registros existentes.

ALTER TABLE prestacao_contas_instrumento
  ADD COLUMN IF NOT EXISTS termo_fomento_id BIGINT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'termo_fomento')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_instrumento_termo_fomento_fk') THEN
    ALTER TABLE prestacao_contas_instrumento
      ADD CONSTRAINT prestacao_instrumento_termo_fomento_fk
      FOREIGN KEY (termo_fomento_id) REFERENCES termo_fomento(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS prestacao_instrumento_termo_fomento_idx
  ON prestacao_contas_instrumento(tenant_id, termo_fomento_id, id DESC);
