-- Regras de integridade que não dependem do frontend.
-- Preserva registros antigos, encerrando apenas alocações ativas duplicadas
-- além da primeira, para que a constraint não falhe em bancos legados.
WITH duplicadas AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, matricula_id ORDER BY id) AS ordem
  FROM educacional_enturmacao
  WHERE data_fim IS NULL
)
UPDATE educacional_enturmacao e
SET data_fim = CURRENT_DATE
FROM duplicadas d
WHERE e.id = d.id AND d.ordem > 1;

CREATE UNIQUE INDEX IF NOT EXISTS educacional_enturmacao_matricula_ativa_uq
  ON educacional_enturmacao (tenant_id, matricula_id)
  WHERE data_fim IS NULL;

CREATE INDEX IF NOT EXISTS educacional_enturmacao_turma_ativa_idx
  ON educacional_enturmacao (tenant_id, turma_id)
  WHERE data_fim IS NULL;

CREATE INDEX IF NOT EXISTS educacional_frequencia_diario_idx
  ON educacional_frequencia (tenant_id, diario_aula_id);

CREATE INDEX IF NOT EXISTS educacional_nota_avaliacao_idx
  ON educacional_nota (tenant_id, avaliacao_id, matricula_id);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_ALUNOS_VISUALIZAR'),
  ('EDUCACIONAL_ALUNOS_EDITAR'),
  ('EDUCACIONAL_DIARIO_VISUALIZAR'),
  ('EDUCACIONAL_FREQUENCIA_VISUALIZAR'),
  ('EDUCACIONAL_AVALIACOES_VISUALIZAR'),
  ('EDUCACIONAL_NOTAS_VISUALIZAR'),
  ('EDUCACIONAL_BOLETINS_VISUALIZAR'),
  ('EDUCACIONAL_OCORRENCIAS_VISUALIZAR'),
  ('EDUCACIONAL_DOCUMENTOS_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
