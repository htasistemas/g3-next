-- Vincula uma medição à evidência do mesmo indicador e tenant.
CREATE UNIQUE INDEX IF NOT EXISTS projeto_indicador_evidencia_id_tenant_uidx
  ON projeto_indicador_evidencia (id, tenant_id);

ALTER TABLE projeto_indicador_medicao
  ADD CONSTRAINT projeto_indicador_medicao_evidencia_fk
  FOREIGN KEY (evidencia_id, tenant_id)
  REFERENCES projeto_indicador_evidencia (id, tenant_id)
  ON DELETE RESTRICT
  NOT VALID;

CREATE INDEX IF NOT EXISTS projeto_indicador_medicao_evidencia_idx
  ON projeto_indicador_medicao (tenant_id, evidencia_id)
  WHERE evidencia_id IS NOT NULL;
