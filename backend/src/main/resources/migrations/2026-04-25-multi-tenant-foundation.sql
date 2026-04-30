BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS instituicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  codigo VARCHAR(30),
  cnpj VARCHAR(20) NOT NULL,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  slug VARCHAR(120) NOT NULL,
  email VARCHAR(150),
  telefone VARCHAR(30),
  endereco TEXT,
  plano VARCHAR(30) NOT NULL DEFAULT 'profissional',
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  logo_url VARCHAR(400),
  cor_tema VARCHAR(20),
  storage_limit_mb INTEGER NOT NULL DEFAULT 2048,
  usuarios_limit INTEGER NOT NULL DEFAULT 25,
  database_mode VARCHAR(20) NOT NULL DEFAULT 'shared',
  database_key VARCHAR(120),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_cnpj_unique ON instituicoes (cnpj);
CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_slug_unique ON instituicoes (slug);
CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_codigo_unique ON instituicoes (codigo) WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS tenant_auditoria_acesso (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  instituicao_id UUID,
  usuario_id BIGINT,
  evento VARCHAR(40) NOT NULL,
  identificador VARCHAR(200),
  ip VARCHAR(60),
  user_agent VARCHAR(300),
  detalhes_json JSONB,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenant_auditoria_acesso_tenant_idx
  ON tenant_auditoria_acesso (tenant_id, criado_em DESC);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS instituicao_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_acesso VARCHAR(60);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_tenant_id UUID;

CREATE INDEX IF NOT EXISTS usuarios_tenant_id_idx ON usuarios (tenant_id);
CREATE INDEX IF NOT EXISTS usuarios_instituicao_id_idx ON usuarios (instituicao_id);
CREATE INDEX IF NOT EXISTS usuarios_tenant_nome_usuario_idx ON usuarios (tenant_id, nome_usuario);
CREATE INDEX IF NOT EXISTS usuarios_tenant_email_idx ON usuarios (tenant_id, email);
CREATE INDEX IF NOT EXISTS usuarios_superadmin_idx ON usuarios (is_superadmin);

DO $$
DECLARE
  nome_tabela TEXT;
  tabelas TEXT[] := ARRAY[
    'usuarios',
    'cadastro_beneficiario',
    'contato_beneficiario',
    'documentos',
    'situacao_social',
    'escolaridade_beneficiario',
    'saude_beneficiario',
    'beneficios_beneficiario',
    'observacoes_beneficiario',
    'vinculo_familiar',
    'vinculo_familiar_membro',
    'unidade_assistencial',
    'cadastro_profissionais',
    'cadastro_voluntario',
    'matriculas',
    'matricula_presencas',
    'registro_doacao',
    'doacoes_realizadas',
    'doacoes_planejadas',
    'agendamentos',
    'agendamento_itens',
    'almoxarifado_itens',
    'almoxarifado_movimentacoes',
    'patrimonio',
    'plano_trabalho',
    'plano_trabalho_metas',
    'plano_trabalho_atividades',
    'plano_trabalho_etapas',
    'plano_trabalho_cronograma',
    'plano_trabalho_equipe',
    'termos_fomento',
    'transparencia',
    'transparencia_recebimentos',
    'transparencia_destinacoes',
    'transparencia_comprovantes',
    'transparencia_timelines',
    'transparencia_checklist',
    'auditoria_evento',
    'parametros_sistema',
    'arquivos_storage',
    'mensagens_personalizadas',
    'checklist_diario_modelos',
    'checklist_diario_atividades',
    'checklist_diario_execucoes',
    'controle_veiculos',
    'fotos_eventos',
    'biblioteca_livros',
    'banco_empregos_candidatos',
    'banco_empregos_vagas',
    'contas_bancarias',
    'contabilidade_lancamentos',
    'contabilidade_movimentacoes',
    'licenca_uso_configuracao',
    'licenca_uso_historico_pagamentos'
  ];
BEGIN
  FOREACH nome_tabela IN ARRAY tabelas LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = nome_tabela
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID', nome_tabela);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', nome_tabela || '_tenant_id_idx', nome_tabela);
    END IF;
  END LOOP;
END
$$;

INSERT INTO instituicoes (
  cnpj,
  razao_social,
  nome_fantasia,
  slug,
  codigo,
  email,
  telefone,
  plano,
  status,
  criado_em,
  atualizado_em
)
SELECT
  COALESCE(NULLIF(regexp_replace(TRIM(ua.cnpj), '\D', '', 'g'), ''), '00000000000000'),
  COALESCE(NULLIF(TRIM(ua.razao_social), ''), NULLIF(TRIM(ua.nome_fantasia), ''), 'Instituicao padrao'),
  COALESCE(NULLIF(TRIM(ua.nome_fantasia), ''), NULLIF(TRIM(ua.razao_social), ''), 'Instituicao padrao'),
  COALESCE(
    NULLIF(regexp_replace(lower(COALESCE(NULLIF(TRIM(ua.nome_fantasia), ''), NULLIF(TRIM(ua.razao_social), ''), 'instituicao-padrao')), '[^a-z0-9]+', '-', 'g'), ''),
    'instituicao-padrao'
  ),
  'PADRAO',
  NULLIF(TRIM(ua.email), ''),
  NULLIF(TRIM(ua.telefone), ''),
  'profissional',
  'ativo',
  NOW(),
  NOW()
FROM unidade_assistencial ua
WHERE ua.unidade_principal = TRUE
LIMIT 1
ON CONFLICT (cnpj) DO NOTHING;

INSERT INTO instituicoes (
  cnpj,
  razao_social,
  nome_fantasia,
  slug,
  codigo,
  plano,
  status,
  criado_em,
  atualizado_em
)
SELECT
  '00000000000000',
  'Instituicao padrao',
  'Instituicao padrao',
  'instituicao-padrao',
  'PADRAO',
  'profissional',
  'ativo',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM instituicoes);

UPDATE usuarios
SET
  tenant_id = ref.tenant_id,
  instituicao_id = ref.id,
  perfil_acesso = COALESCE(NULLIF(TRIM(perfil_acesso), ''), 'ADMINISTRADOR')
FROM (
  SELECT id, tenant_id
  FROM instituicoes
  ORDER BY criado_em ASC
  LIMIT 1
) ref
WHERE usuarios.tenant_id IS NULL;

DO $$
DECLARE
  nome_tabela TEXT;
  tabelas_backfill TEXT[] := ARRAY[
    'cadastro_beneficiario',
    'contato_beneficiario',
    'documentos',
    'situacao_social',
    'escolaridade_beneficiario',
    'saude_beneficiario',
    'beneficios_beneficiario',
    'observacoes_beneficiario',
    'vinculo_familiar',
    'vinculo_familiar_membro',
    'unidade_assistencial',
    'cadastro_profissionais',
    'cadastro_voluntario',
    'matriculas',
    'matricula_presencas',
    'registro_doacao',
    'doacoes_realizadas',
    'doacoes_planejadas',
    'agendamentos',
    'agendamento_itens',
    'almoxarifado_itens',
    'almoxarifado_movimentacoes',
    'patrimonio',
    'plano_trabalho',
    'plano_trabalho_metas',
    'plano_trabalho_atividades',
    'plano_trabalho_etapas',
    'plano_trabalho_cronograma',
    'plano_trabalho_equipe',
    'termos_fomento',
    'transparencia',
    'transparencia_recebimentos',
    'transparencia_destinacoes',
    'transparencia_comprovantes',
    'transparencia_timelines',
    'transparencia_checklist',
    'auditoria_evento',
    'parametros_sistema',
    'arquivos_storage',
    'mensagens_personalizadas',
    'checklist_diario_modelos',
    'checklist_diario_atividades',
    'checklist_diario_execucoes',
    'controle_veiculos',
    'fotos_eventos',
    'biblioteca_livros',
    'banco_empregos_candidatos',
    'banco_empregos_vagas',
    'contas_bancarias',
    'contabilidade_lancamentos',
    'contabilidade_movimentacoes',
    'licenca_uso_configuracao',
    'licenca_uso_historico_pagamentos'
  ];
BEGIN
  FOREACH nome_tabela IN ARRAY tabelas_backfill LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = nome_tabela
    ) THEN
      EXECUTE format(
        'UPDATE %I SET tenant_id = ref.tenant_id FROM (SELECT tenant_id FROM instituicoes ORDER BY criado_em ASC LIMIT 1) ref WHERE %I.tenant_id IS NULL',
        nome_tabela,
        nome_tabela
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
