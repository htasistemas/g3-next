import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const tabelasOperacionaisMultiTenant = [
  "usuarios",
  "cadastro_beneficiario",
  "contato_beneficiario",
  "documentos",
  "situacao_social",
  "escolaridade_beneficiario",
  "saude_beneficiario",
  "beneficios_beneficiario",
  "observacoes_beneficiario",
  "vinculo_familiar",
  "vinculo_familiar_membro",
  "unidade_assistencial",
  "cadastro_profissionais",
  "cadastro_voluntario",
  "matriculas",
  "matricula_presencas",
  "registro_doacao",
  "doacao_realizada",
  "doacao_realizada_item",
  "doacoes_realizadas",
  "doacoes_planejadas",
  "agendamentos",
  "agendamento_itens",
  "agendamento",
  "agendamento_lista_espera",
  "agendamento_log",
  "agendamento_beneficiario",
  "agendamento_envio",
  "almoxarifado_item",
  "almoxarifado_itens",
  "almoxarifado_movimentacao",
  "almoxarifado_movimentacoes",
  "patrimonio_item",
  "patrimonio_movimentacao",
  "patrimonio",
  "plano_trabalho",
  "plano_trabalho_metas",
  "plano_trabalho_atividades",
  "plano_trabalho_etapas",
  "plano_trabalho_cronograma",
  "plano_trabalho_equipe",
  "termos_fomento",
  "transparencia",
  "transparencia_recebimentos",
  "transparencia_destinacoes",
  "transparencia_comprovantes",
  "transparencia_timelines",
  "transparencia_checklist",
  "auditoria_evento",
  "parametros_sistema",
  "arquivos_storage",
  "mensagens_personalizadas",
  "checklist_diario_modelos",
  "checklist_diario_atividades",
  "checklist_diario_execucoes",
  "controle_veiculos",
  "fotos_eventos",
  "biblioteca_livro",
  "biblioteca_livros",
  "biblioteca_emprestimo",
  "visita_domiciliar",
  "visita_domiciliar_anexo",
  "central_atendimento",
  "central_beneficio",
  "central_encaminhamento",
  "central_auditoria",
  "cursos_atendimentos",
  "cursos_atendimentos_matriculas",
  "cursos_atendimentos_fila_espera",
  "cursos_atendimentos_presencas",
  "cursos_atendimentos_presenca_datas",
  "cursos_atendimentos_presenca_anexos",
  "cursos_atendimentos_status",
  "voluntario_escala",
  "banco_empregos_candidatos",
  "banco_empregos_vagas",
  "contas_bancarias",
  "contabilidade_lancamentos",
  "contabilidade_movimentacoes",
  "licenca_uso_configuracao",
  "licenca_uso_historico_pagamentos",
  "cadastro_profissional",
  "salas",
  "item_almoxarifado"
] as const;

const sqlEstruturaMultiTenantBase = [
  "CREATE EXTENSION IF NOT EXISTS pgcrypto",
  `
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
  )
  `,
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS codigo VARCHAR(30)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE instituicoes ALTER COLUMN tenant_id SET DEFAULT gen_random_uuid()",
  "UPDATE instituicoes SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL",
  "ALTER TABLE instituicoes ALTER COLUMN tenant_id SET NOT NULL",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(200)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS slug VARCHAR(120)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS telefone VARCHAR(30)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS endereco TEXT",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS plano VARCHAR(30) NOT NULL DEFAULT 'profissional'",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ativo'",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS logo_url VARCHAR(400)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS cor_tema VARCHAR(20)",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER NOT NULL DEFAULT 2048",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS usuarios_limit INTEGER NOT NULL DEFAULT 25",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS database_mode VARCHAR(20) NOT NULL DEFAULT 'shared'",
  "ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS database_key VARCHAR(120)",
  "CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_cnpj_unique ON instituicoes (cnpj)",
  "CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_slug_unique ON instituicoes (slug)",
  "CREATE UNIQUE INDEX IF NOT EXISTS instituicoes_codigo_unique ON instituicoes (codigo) WHERE codigo IS NOT NULL",
  `
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
  )
  `,
  "CREATE INDEX IF NOT EXISTS tenant_auditoria_acesso_tenant_idx ON tenant_auditoria_acesso (tenant_id, criado_em DESC)",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS instituicao_id UUID",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_acesso VARCHAR(60)",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_tenant_id UUID",
  "DROP INDEX IF EXISTS usuarios_nome_usuario_unique",
  "DROP INDEX IF EXISTS usuarios_email_unique",
  "CREATE INDEX IF NOT EXISTS usuarios_tenant_id_idx ON usuarios (tenant_id)",
  "CREATE INDEX IF NOT EXISTS usuarios_instituicao_id_idx ON usuarios (instituicao_id)",
  "CREATE INDEX IF NOT EXISTS usuarios_tenant_nome_usuario_idx ON usuarios (tenant_id, nome_usuario)",
  "CREATE INDEX IF NOT EXISTS usuarios_tenant_email_idx ON usuarios (tenant_id, email)",
  "CREATE UNIQUE INDEX IF NOT EXISTS usuarios_tenant_nome_usuario_unique_idx ON usuarios (tenant_id, lower(nome_usuario)) WHERE deletado_em IS NULL AND tenant_id IS NOT NULL AND nome_usuario IS NOT NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS usuarios_tenant_email_unique_idx ON usuarios (tenant_id, lower(email)) WHERE deletado_em IS NULL AND tenant_id IS NOT NULL AND email IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS usuarios_superadmin_idx ON usuarios (is_superadmin)",
  "ALTER TABLE unidade_assistencial ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS unidade_assistencial_tenant_id_idx ON unidade_assistencial (tenant_id)",
  `
  INSERT INTO instituicoes (
    cnpj,
    razao_social,
    nome_fantasia,
    slug,
    codigo,
    email,
    telefone,
    endereco,
    plano,
    status,
    criado_em,
    atualizado_em
  )
  SELECT
    COALESCE(NULLIF(regexp_replace(TRIM(ua.cnpj), '\\D', '', 'g'), ''), '00000000000000'),
    COALESCE(NULLIF(TRIM(ua.razao_social), ''), NULLIF(TRIM(ua.nome_fantasia), ''), 'Instituição padrão'),
    COALESCE(NULLIF(TRIM(ua.nome_fantasia), ''), NULLIF(TRIM(ua.razao_social), ''), 'Instituição padrão'),
    COALESCE(
      NULLIF(
        regexp_replace(lower(COALESCE(NULLIF(TRIM(ua.nome_fantasia), ''), NULLIF(TRIM(ua.razao_social), ''), 'instituicao-padrao')), '[^a-z0-9]+', '-', 'g'),
        ''
      ),
      'instituicao-padrao'
    ),
    'PADRAO',
    NULLIF(TRIM(ua.email), ''),
    NULLIF(TRIM(ua.telefone), ''),
    NULL,
    'profissional',
    'ativo',
    NOW(),
    NOW()
  FROM unidade_assistencial ua
  WHERE ua.unidade_principal = TRUE
  LIMIT 1
  ON CONFLICT (cnpj) DO NOTHING
  `,
  `
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
    'Instituição padrão',
    'Instituição padrão',
    'instituicao-padrao',
    'PADRAO',
    'profissional',
    'ativo',
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM instituicoes)
  `,
  `
  UPDATE unidade_assistencial ua
  SET tenant_id = i.tenant_id
  FROM instituicoes i
  WHERE ua.tenant_id IS NULL
    AND (
      ua.unidade_principal = TRUE
      OR i.codigo = 'PADRAO'
    )
  `,
  `
  UPDATE usuarios
  SET
    tenant_id = i.tenant_id,
    instituicao_id = i.id,
    perfil_acesso = COALESCE(NULLIF(TRIM(perfil_acesso), ''), 'ADMINISTRADOR')
  FROM (
    SELECT id, tenant_id
    FROM instituicoes
    ORDER BY criado_em ASC
    LIMIT 1
  ) i
  WHERE usuarios.tenant_id IS NULL
  `,
  `
  UPDATE usuarios
  SET is_superadmin = TRUE
  WHERE lower(coalesce(email, '')) = 'htasistemas@gmail.com'
  `,
  `
  INSERT INTO permissao (nome)
  VALUES
    ('MASTER_ADMIN'),
    ('MASTER_INSTITUICOES_VISUALIZAR'),
    ('MASTER_INSTITUICOES_EDITAR'),
    ('MASTER_PLANOS_GERENCIAR')
  ON CONFLICT (nome) DO NOTHING
  `
] as const;

const estruturaInicializada = {
  valor: false
};
let estruturaInicializando: Promise<void> | null = null;

function sqlTenantPorTabela(nomeTabela: string) {
  return [
    `ALTER TABLE IF EXISTS ${nomeTabela} ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '${nomeTabela}'
      ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS ${nomeTabela}_tenant_id_idx ON ${nomeTabela} (tenant_id)';
      END IF;
    END
    $$;
    `
  ];
}

export async function ensureMultiTenantStructure(db: DatabaseLike) {
  if (estruturaInicializada.valor) return;
  if (!estruturaInicializando) {
    estruturaInicializando = (async () => {
      for (const sql of sqlEstruturaMultiTenantBase) {
        await db.$executeRawUnsafe(sql);
      }

      for (const tabela of tabelasOperacionaisMultiTenant) {
        for (const sql of sqlTenantPorTabela(tabela)) {
          await db.$executeRawUnsafe(sql);
        }
      }

      const tabelasBackfill = tabelasOperacionaisMultiTenant.filter((item) => item !== "usuarios");
      for (const tabela of tabelasBackfill) {
        await db.$executeRawUnsafe(
          `
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = '${tabela}'
            ) THEN
              EXECUTE $cmd$
                UPDATE ${tabela}
                SET tenant_id = ref.tenant_id
                FROM (
                  SELECT tenant_id
                  FROM instituicoes
                  ORDER BY criado_em ASC
                  LIMIT 1
                ) ref
                WHERE ${tabela}.tenant_id IS NULL
              $cmd$;
            END IF;
          END
          $$;
          `
        );
      }

      estruturaInicializada.valor = true;
    })().catch((error) => {
      estruturaInicializando = null;
      throw error;
    });
  }

  await estruturaInicializando;
}
