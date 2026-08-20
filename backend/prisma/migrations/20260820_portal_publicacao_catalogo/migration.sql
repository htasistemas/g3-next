-- Sincroniza a publicação inicial do catálogo institucional com o Portal Público.
-- A configuração continua editável pela administração após a publicação.
UPDATE instituicoes i
SET cor_tema = '#007f67'
WHERE i.slug = 'adra-uberlandia'
  AND (i.cor_tema IS NULL OR BTRIM(i.cor_tema) = '');

UPDATE cursos_atendimentos c
SET inscricao_publica = TRUE
FROM instituicoes i
WHERE i.slug = 'adra-uberlandia'
  AND c.tenant_id = i.tenant_id
  AND c.status = 'ATIVO';
