-- Endurecimento incremental do modulo de termos de parceria.
-- Nao remove dados nem altera contratos existentes.

CREATE UNIQUE INDEX IF NOT EXISTS prestacao_instrumento_tenant_numero_uk
  ON prestacao_contas_instrumento(tenant_id, numero_instrumento)
  WHERE numero_instrumento IS NOT NULL AND btrim(numero_instrumento) <> '' AND excluido_em IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_instrumento_valores_nao_negativos_ck') THEN
    ALTER TABLE prestacao_contas_instrumento
      ADD CONSTRAINT prestacao_instrumento_valores_nao_negativos_ck CHECK (
        valor_global >= 0 AND valor_repasse >= 0 AND contrapartida_financeira >= 0
        AND contrapartida_bens_servicos >= 0 AND recursos_proprios >= 0
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_instrumento_vigencia_ck') THEN
    ALTER TABLE prestacao_contas_instrumento
      ADD CONSTRAINT prestacao_instrumento_vigencia_ck CHECK (
        inicio_vigencia IS NULL OR termino_vigencia IS NULL OR termino_vigencia >= inicio_vigencia
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_rubrica_valores_nao_negativos_ck') THEN
    ALTER TABLE prestacao_contas_rubrica
      ADD CONSTRAINT prestacao_rubrica_valores_nao_negativos_ck CHECK (
        COALESCE(quantidade, 0) >= 0 AND COALESCE(valor_unitario, 0) >= 0
        AND valor_total >= 0 AND valor_reservado >= 0 AND valor_comprometido >= 0 AND valor_pago >= 0
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_receita_valores_nao_negativos_ck') THEN
    ALTER TABLE prestacao_contas_receita
      ADD CONSTRAINT prestacao_receita_valores_nao_negativos_ck CHECK (valor_previsto >= 0 AND valor_recebido >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prestacao_despesa_valores_nao_negativos_ck') THEN
    ALTER TABLE prestacao_contas_despesa
      ADD CONSTRAINT prestacao_despesa_valores_nao_negativos_ck CHECK (
        valor_bruto >= 0 AND desconto >= 0 AND retencoes >= 0 AND tributos >= 0 AND valor_liquido >= 0
      );
  END IF;
END $$;
