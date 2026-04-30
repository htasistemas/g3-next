import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const sqlEstruturaChecklistDiario: string[] = [
  `
  CREATE TABLE IF NOT EXISTS checklist_configuracoes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    sabado_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    domingo_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS checklist_modelos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    codigo VARCHAR(80) UNIQUE,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) NOT NULL,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    unidade_id BIGINT REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
    setor VARCHAR(150),
    cargo VARCHAR(150),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    atualizado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT checklist_modelos_tipo_ck CHECK (tipo IN ('INSTITUCIONAL', 'SETOR', 'FUNCAO', 'USUARIO'))
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS checklist_modelo_itens (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    modelo_id BIGINT NOT NULL REFERENCES checklist_modelos(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao_detalhada TEXT,
    horario_previsto TIME,
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    alerta_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    horario_alerta TIME,
    observacao_obrigatoria BOOLEAN NOT NULL DEFAULT FALSE,
    atividade_critica BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT checklist_modelo_itens_dia_ck CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT checklist_modelo_itens_prioridade_ck CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'))
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS checklist_execucoes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    modelo_id BIGINT REFERENCES checklist_modelos(id) ON DELETE SET NULL,
    modelo_item_id BIGINT REFERENCES checklist_modelo_itens(id) ON DELETE SET NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    unidade_id BIGINT REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
    setor VARCHAR(150),
    cargo VARCHAR(150),
    referencia_data DATE NOT NULL,
    semana_inicio DATE NOT NULL,
    dia_semana SMALLINT NOT NULL,
    titulo_atividade VARCHAR(200) NOT NULL,
    descricao_detalhada TEXT,
    horario_previsto TIME,
    prioridade VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
    alerta_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    horario_alerta TIME,
    observacao_obrigatoria BOOLEAN NOT NULL DEFAULT FALSE,
    atividade_critica BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    observacao_usuario TEXT,
    concluido_em TIMESTAMP,
    concluido_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    dispensado_em TIMESTAMP,
    dispensado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_dispensa TEXT,
    nao_aplicavel_motivo TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    gerado_automaticamente BOOLEAN NOT NULL DEFAULT TRUE,
    origem VARCHAR(40) NOT NULL DEFAULT 'AUTOMATICA',
    chave_geracao VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT checklist_execucoes_dia_ck CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT checklist_execucoes_prioridade_ck CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    CONSTRAINT checklist_execucoes_status_ck CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'ATRASADO', 'DISPENSADO', 'NAO_SE_APLICA'))
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS checklist_execucao_historico (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    referencia_tipo VARCHAR(30) NOT NULL DEFAULT 'EXECUCAO',
    execucao_id BIGINT REFERENCES checklist_execucoes(id) ON DELETE CASCADE,
    modelo_id BIGINT REFERENCES checklist_modelos(id) ON DELETE SET NULL,
    modelo_item_id BIGINT REFERENCES checklist_modelo_itens(id) ON DELETE SET NULL,
    configuracao_id BIGINT REFERENCES checklist_configuracoes(id) ON DELETE SET NULL,
    acao VARCHAR(60) NOT NULL,
    status_anterior VARCHAR(20),
    status_novo VARCHAR(20),
    usuario_responsavel_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    observacao TEXT,
    motivo TEXT,
    origem VARCHAR(40),
    dados_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE UNIQUE INDEX IF NOT EXISTS checklist_execucoes_chave_geracao_uidx ON checklist_execucoes(chave_geracao) WHERE chave_geracao IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS checklist_configuracoes_tenant_idx ON checklist_configuracoes(tenant_id)",
  "CREATE INDEX IF NOT EXISTS checklist_modelos_tenant_idx ON checklist_modelos(tenant_id, ativo)",
  "CREATE INDEX IF NOT EXISTS checklist_modelo_itens_tenant_idx ON checklist_modelo_itens(tenant_id, modelo_id)",
  "CREATE INDEX IF NOT EXISTS checklist_execucoes_tenant_idx ON checklist_execucoes(tenant_id, referencia_data)",
  "CREATE INDEX IF NOT EXISTS checklist_execucao_historico_tenant_idx ON checklist_execucao_historico(tenant_id, criado_em DESC)",
  "CREATE INDEX IF NOT EXISTS checklist_execucoes_usuario_data_idx ON checklist_execucoes(usuario_id, referencia_data)",
  "CREATE INDEX IF NOT EXISTS checklist_execucoes_semana_idx ON checklist_execucoes(semana_inicio, dia_semana)",
  "CREATE INDEX IF NOT EXISTS checklist_execucoes_status_idx ON checklist_execucoes(status)",
  "CREATE INDEX IF NOT EXISTS checklist_execucoes_unidade_idx ON checklist_execucoes(unidade_id)",
  "CREATE INDEX IF NOT EXISTS checklist_execucao_historico_execucao_idx ON checklist_execucao_historico(execucao_id, criado_em DESC)",
  "CREATE INDEX IF NOT EXISTS checklist_modelo_itens_modelo_idx ON checklist_modelo_itens(modelo_id, dia_semana, ordem)",
  "INSERT INTO checklist_configuracoes (id, sabado_ativo, domingo_ativo) VALUES (1, FALSE, FALSE) ON CONFLICT (id) DO NOTHING",
  `
  INSERT INTO checklist_modelos (
    codigo,
    nome,
    descricao,
    tipo,
    ativo,
    criado_em,
    atualizado_em
  )
  VALUES (
    'CHECKLIST_ADMINISTRATIVO_PADRAO',
    'Checklist administrativo institucional padrão',
    'Modelo inicial de rotina administrativa semanal para instituições do terceiro setor.',
    'INSTITUCIONAL',
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (codigo) DO NOTHING
  `,
  `
  INSERT INTO checklist_modelo_itens (
    modelo_id, dia_semana, titulo, descricao_detalhada, horario_previsto, prioridade, alerta_ativo, horario_alerta, observacao_obrigatoria, atividade_critica, ordem, ativo, criado_em, atualizado_em
  )
  SELECT m.id, v.dia_semana, v.titulo, v.descricao, CAST(v.horario_previsto AS TIME), v.prioridade, v.alerta_ativo, CAST(v.horario_alerta AS TIME), v.observacao_obrigatoria, v.atividade_critica, v.ordem, TRUE, NOW(), NOW()
  FROM checklist_modelos m
  JOIN (
    VALUES
      (1, 'Conferir relatórios pendentes da semana anterior', 'Revisar relatórios administrativos que ficaram abertos na semana anterior.', '08:00', 'ALTA', TRUE, '07:45', FALSE, TRUE, 1),
      (1, 'Conferir documentos de prestação de contas', 'Verificar documentos e comprovantes necessários para a prestação de contas.', '08:45', 'ALTA', TRUE, '08:30', TRUE, TRUE, 2),
      (1, 'Validar atendimentos lançados no sistema', 'Conferir consistência dos atendimentos registrados no G3N.', '09:30', 'ALTA', FALSE, NULL, FALSE, TRUE, 3),
      (1, 'Revisar cadastros atualizados de beneficiários', 'Confirmar se atualizações cadastrais foram concluídas corretamente.', '10:30', 'MEDIA', FALSE, NULL, FALSE, FALSE, 4),
      (1, 'Conferir pendências administrativas gerais', 'Checar pendências do setor antes do avanço da semana.', '11:30', 'ALTA', TRUE, '11:00', TRUE, TRUE, 5),
      (1, 'Organizar agenda institucional da semana', 'Preparar agenda com compromissos, visitas e reuniões da instituição.', '14:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 6),
      (1, 'Conferir e-mails e comunicados pendentes', 'Analisar comunicações institucionais ainda sem tratamento.', '15:30', 'MEDIA', FALSE, NULL, FALSE, FALSE, 7),
      (1, 'Verificar necessidades do almoxarifado', 'Levantar necessidades operacionais e itens críticos de estoque.', '16:30', 'MEDIA', TRUE, '16:10', FALSE, FALSE, 8),
      (2, 'Conferir agenda de atendimentos do dia', 'Validar compromissos administrativos e atendimentos previstos para o dia.', '08:00', 'ALTA', TRUE, '07:45', FALSE, TRUE, 1),
      (2, 'Validar listas de presença e registros de atividades', 'Conferir registros operacionais recebidos das atividades.', '09:00', 'ALTA', FALSE, NULL, TRUE, TRUE, 2),
      (2, 'Atualizar histórico de atendimentos', 'Registrar pendências e movimentações administrativas relacionadas aos atendimentos.', '10:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 3),
      (2, 'Conferir documentação de beneficiários pendentes', 'Verificar documentos faltantes ou aguardando validação.', '11:00', 'MEDIA', TRUE, '10:45', TRUE, FALSE, 4),
      (2, 'Verificar solicitações internas dos setores', 'Consolidar demandas recebidas de outros setores.', '14:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 5),
      (2, 'Atualizar andamento de oficinas, cursos e atendimentos', 'Refletir no sistema o estágio atual das rotinas em execução.', '15:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 6),
      (2, 'Revisar encaminhamentos pendentes', 'Checar encaminhamentos que exigem retorno administrativo.', '16:30', 'ALTA', TRUE, '16:00', TRUE, TRUE, 7),
      (3, 'Conferir lançamentos financeiros e doações', 'Validar lançamentos administrativos vinculados a receitas e doações.', '08:00', 'ALTA', TRUE, '07:45', FALSE, TRUE, 1),
      (3, 'Validar comprovantes e documentos de despesas', 'Revisar anexos, notas e documentos de despesas do período.', '09:00', 'ALTA', TRUE, '08:40', TRUE, TRUE, 2),
      (3, 'Revisar movimentações administrativas e financeiras', 'Cruzar movimentações e apontar inconsistências.', '10:15', 'ALTA', FALSE, NULL, FALSE, TRUE, 3),
      (3, 'Conferir prestação de contas parcial da semana', 'Montar conferência parcial antes do fechamento semanal.', '11:30', 'ALTA', TRUE, '11:00', TRUE, TRUE, 4),
      (3, 'Verificar relatórios internos de execução', 'Analisar relatórios de execução produzidos até o momento.', '14:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 5),
      (3, 'Atualizar controles de campanhas e arrecadações', 'Manter controles internos sincronizados com as campanhas.', '15:15', 'MEDIA', FALSE, NULL, FALSE, FALSE, 6),
      (3, 'Conferir documentos digitalizados e anexos', 'Garantir integridade e organização dos documentos digitalizados.', '16:30', 'MEDIA', FALSE, NULL, FALSE, FALSE, 7),
      (4, 'Revisar vínculos familiares e cadastros relacionados', 'Conferir consistência entre cadastros e vínculos familiares.', '08:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 1),
      (4, 'Conferir benefícios concedidos na semana', 'Avaliar registros e documentação dos benefícios concedidos.', '09:00', 'ALTA', TRUE, '08:45', TRUE, TRUE, 2),
      (4, 'Validar ocorrências de duplicidade ou inconsistência', 'Apontar dados conflitantes, duplicados ou fora do padrão.', '10:00', 'ALTA', TRUE, '09:45', TRUE, TRUE, 3),
      (4, 'Revisar pendências sociais e administrativas', 'Consolidar pendências abertas por beneficiário, setor e processo.', '11:30', 'ALTA', FALSE, NULL, FALSE, TRUE, 4),
      (4, 'Atualizar relatórios de acompanhamento', 'Atualizar relatórios internos de acompanhamento institucional.', '14:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 5),
      (4, 'Conferir alertas críticos do sistema', 'Analisar alertas do G3N que exijam ação administrativa.', '15:30', 'CRITICA', TRUE, '15:00', TRUE, TRUE, 6),
      (4, 'Organizar documentos para fechamento semanal', 'Preparar documentos e comprovantes para o fechamento de sexta-feira.', '16:30', 'ALTA', FALSE, NULL, FALSE, FALSE, 7),
      (5, 'Gerar relatório semanal administrativo', 'Consolidar relatório semanal com pendências e entregas do setor.', '08:00', 'CRITICA', TRUE, '07:40', TRUE, TRUE, 1),
      (5, 'Conferir indicadores da semana', 'Validar indicadores operacionais antes do fechamento.', '09:00', 'ALTA', FALSE, NULL, FALSE, TRUE, 2),
      (5, 'Revisar pendências não concluídas', 'Checar itens ainda em aberto para decisão de replanejamento.', '10:00', 'ALTA', TRUE, '09:40', TRUE, TRUE, 3),
      (5, 'Validar documentos obrigatórios da semana', 'Conferir documentos que precisam fechar a semana regularizados.', '11:00', 'ALTA', TRUE, '10:45', TRUE, TRUE, 4),
      (5, 'Atualizar dashboard gerencial', 'Atualizar leitura gerencial da semana no G3N.', '14:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 5),
      (5, 'Organizar arquivos e comprovantes', 'Arquivar comprovantes e documentos físicos ou digitais.', '15:00', 'MEDIA', FALSE, NULL, FALSE, FALSE, 6),
      (5, 'Encerrar checklist semanal', 'Realizar conferência final das rotinas executadas na semana.', '16:00', 'CRITICA', TRUE, '15:40', TRUE, TRUE, 7),
      (5, 'Preparar pendências para a próxima semana', 'Registrar transição das pendências para a semana seguinte.', '16:45', 'ALTA', FALSE, NULL, TRUE, FALSE, 8)
  ) AS v(dia_semana, titulo, descricao, horario_previsto, prioridade, alerta_ativo, horario_alerta, observacao_obrigatoria, atividade_critica, ordem)
    ON TRUE
  WHERE m.codigo = 'CHECKLIST_ADMINISTRATIVO_PADRAO'
    AND NOT EXISTS (
      SELECT 1
      FROM checklist_modelo_itens x
      WHERE x.modelo_id = m.id
        AND x.dia_semana = v.dia_semana
        AND x.titulo = v.titulo
    )
  `,
  `
  INSERT INTO permissao (nome)
  VALUES
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_PROPRIO'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CONCLUIR_ATIVIDADE'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_INFORMAR_OBSERVACAO'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_REABRIR_ATIVIDADE'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_INDICADORES'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_GERENCIAR_CONFIGURACOES'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_SABADO'),
    ('SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_DOMINGO')
  ON CONFLICT (nome) DO NOTHING
  `
];

let estruturaInicializada = false;
let estruturaInicializando: Promise<void> | null = null;

export async function ensureChecklistDiarioEstrutura(db: DatabaseLike) {
  if (estruturaInicializada) return;

  if (!estruturaInicializando) {
    estruturaInicializando = (async () => {
      for (const sql of sqlEstruturaChecklistDiario) {
        await db.$executeRawUnsafe(sql);
      }
      await db.$executeRawUnsafe("ALTER TABLE checklist_configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await db.$executeRawUnsafe("ALTER TABLE checklist_modelos ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await db.$executeRawUnsafe("ALTER TABLE checklist_modelo_itens ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await db.$executeRawUnsafe("ALTER TABLE checklist_execucoes ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await db.$executeRawUnsafe("ALTER TABLE checklist_execucao_historico ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await db.$executeRawUnsafe(`
        UPDATE checklist_modelos AS m
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC
          LIMIT 1
        ) ref
        WHERE m.tenant_id IS NULL
      `);
      await db.$executeRawUnsafe(`
        UPDATE checklist_modelo_itens AS i
        SET tenant_id = m.tenant_id
        FROM checklist_modelos m
        WHERE i.tenant_id IS NULL
          AND m.id = i.modelo_id
      `);
      await db.$executeRawUnsafe(`
        UPDATE checklist_execucoes AS e
        SET tenant_id = COALESCE(u.tenant_id, m.tenant_id)
        FROM usuarios u
        LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
        WHERE e.tenant_id IS NULL
          AND u.id = e.usuario_id
      `);
      await db.$executeRawUnsafe(`
        UPDATE checklist_execucao_historico AS h
        SET tenant_id = COALESCE(e.tenant_id, m.tenant_id)
        FROM checklist_execucoes e
        LEFT JOIN checklist_modelos m ON m.id = h.modelo_id
        WHERE h.tenant_id IS NULL
          AND (
            (e.id = h.execucao_id)
            OR h.execucao_id IS NULL
          )
      `);
      await db.$executeRawUnsafe(`
        UPDATE checklist_configuracoes AS c
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC
          LIMIT 1
        ) ref
        WHERE c.tenant_id IS NULL
      `);
      estruturaInicializada = true;
    })().catch((error) => {
      estruturaInicializando = null;
      throw error;
    });
  }

  await estruturaInicializando;
}
