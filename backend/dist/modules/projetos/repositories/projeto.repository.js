import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const permissoesModulo = [
    "SETOR_ADMINISTRATIVO_PROJETOS_VISUALIZAR",
    "SETOR_ADMINISTRATIVO_PROJETOS_CRIAR",
    "SETOR_ADMINISTRATIVO_PROJETOS_EDITAR",
    "SETOR_ADMINISTRATIVO_PROJETOS_EXCLUIR",
    "SETOR_ADMINISTRATIVO_PROJETOS_GERENCIAR_TAREFAS",
    "SETOR_ADMINISTRATIVO_PROJETOS_MOVER_TAREFAS_KANBAN",
    "SETOR_ADMINISTRATIVO_PROJETOS_VISUALIZAR_RELATORIOS",
    "SETOR_ADMINISTRATIVO_PROJETOS_IMPRIMIR_RELATORIOS"
];
const estruturaSql = [
    `
    CREATE TABLE IF NOT EXISTS projetos (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      nome VARCHAR(200) NOT NULL,
      descricao_completa TEXT,
      objetivo_geral TEXT,
      publico_alvo TEXT,
      unidade_assistencial_id BIGINT,
      responsavel VARCHAR(160) NOT NULL,
      equipe_envolvida JSONB,
      data_inicio DATE NOT NULL,
      prazo_previsto DATE NOT NULL,
      data_termino_real DATE,
      prioridade VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL,
      area_projeto VARCHAR(40) NOT NULL,
      fonte_recurso VARCHAR(200),
      observacoes TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS projeto_tarefas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
      titulo VARCHAR(200) NOT NULL,
      descricao TEXT,
      tipo_tarefa VARCHAR(30) NOT NULL,
      responsavel VARCHAR(160) NOT NULL,
      prioridade VARCHAR(20) NOT NULL,
      status VARCHAR(30) NOT NULL,
      data_prevista DATE,
      data_conclusao DATE,
      observacoes TEXT,
      ordem_kanban INTEGER NOT NULL DEFAULT 0,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by BIGINT,
      updated_by BIGINT
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS projeto_historico (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      projeto_id BIGINT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
      tarefa_id BIGINT REFERENCES projeto_tarefas(id) ON DELETE CASCADE,
      tipo_evento VARCHAR(40) NOT NULL,
      descricao TEXT NOT NULL,
      detalhes_json JSONB,
      usuario_id BIGINT,
      usuario_nome VARCHAR(160),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    `CREATE INDEX IF NOT EXISTS projetos_tenant_idx ON projetos(tenant_id, ativo, updated_at DESC, id DESC)`,
    `CREATE INDEX IF NOT EXISTS projeto_tarefas_tenant_idx ON projeto_tarefas(tenant_id, projeto_id, status, ordem_kanban, id)`,
    `CREATE INDEX IF NOT EXISTS projeto_historico_tenant_idx ON projeto_historico(tenant_id, projeto_id, created_at DESC, id DESC)`,
    `CREATE INDEX IF NOT EXISTS projetos_unidade_idx ON projetos(unidade_assistencial_id)`,
    `
    INSERT INTO permissao (nome)
    VALUES
      ${permissoesModulo.map((item) => `('${item}')`).join(",\n      ")}
    ON CONFLICT (nome) DO NOTHING
  `,
    `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT DISTINCT admin.usuario_id, permissao_nova.id
    FROM usuario_permissao admin
    INNER JOIN permissao permissao_admin
      ON permissao_admin.id = admin.permissao_id
     AND permissao_admin.nome = 'ADMINISTRADOR'
    CROSS JOIN permissao permissao_nova
    WHERE permissao_nova.nome IN (${permissoesModulo.map((item) => `'${item}'`).join(", ")})
    ON CONFLICT DO NOTHING
  `,
    `
    INSERT INTO manual_sistema_secoes (slug, titulo, conteudo, ordem, tags, atualizado_em, atualizado_por, versao)
    VALUES (
      'setor-administrativo-projetos',
      'Administração e gestão > Projetos',
      '<p>A tela Projetos concentra o cadastro, acompanhamento, kanban, indicadores e relatórios dos projetos sociais da instituição.</p><ul><li>Use a aba Visão geral para acompanhar totais, atrasos, evolução e vencimentos.</li><li>Use a aba Projetos para filtrar, cadastrar, editar, inativar e abrir os detalhes de cada projeto.</li><li>No detalhe do projeto, mantenha dados principais, tarefas, histórico e observações sempre atualizados.</li><li>Na área Kanban, mova as tarefas entre Não iniciado, Em andamento, Parado e Concluído com um clique e arraste.</li><li>Na aba Relatórios, gere PDFs gerais, por status, prioridade, atrasos, evolução, tarefas por responsável e relatório completo individual.</li></ul>',
      140,
      'projetos,administração e gestão,kanban,relatorios',
      NOW(),
      'sistema',
      '1.00.487'
    )
    ON CONFLICT (slug) DO UPDATE
    SET titulo = EXCLUDED.titulo,
        conteudo = EXCLUDED.conteudo,
        tags = EXCLUDED.tags,
        atualizado_em = NOW(),
        atualizado_por = 'sistema',
        versao = '1.00.487'
  `,
    `
    INSERT INTO manual_sistema_mudancas (
      data_mudanca,
      autor,
      modulo,
      tela,
      tipo,
      descricao_curta,
      descricao_detalhada,
      versao_build,
      links
    )
    SELECT
      NOW(),
      'sistema',
      'Administração e gestão',
      'Projetos',
      'CRIACAO',
      'Nova tela Projetos com cards, dashboard, kanban, tarefas e relatórios.',
      'A entrega inclui gestão multi-tenant de projetos sociais, tarefas vinculadas, histórico/auditoria, dashboard com indicadores reais e relatórios PDF no padrão institucional.',
      '1.00.487',
      '/administrativo/projetos'
    WHERE NOT EXISTS (
      SELECT 1
      FROM manual_sistema_mudancas
      WHERE tela = 'Projetos'
        AND versao_build = '1.00.487'
    )
  `
];
let estruturaPromise = null;
export class ProjetoRepository {
    async garantirEstrutura() {
        if (!estruturaPromise) {
            estruturaPromise = (async () => {
                for (const sql of estruturaSql) {
                    await prisma.$executeRawUnsafe(sql);
                }
            })().catch((error) => {
                estruturaPromise = null;
                throw error;
            });
        }
        await estruturaPromise;
    }
    async listar(filters, tenantId) {
        await this.garantirEstrutura();
        const where = this.buildWhere(filters, tenantId, "p");
        const projetos = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.tenant_id::text AS tenant_id,
        p.nome,
        p.descricao_completa,
        p.objetivo_geral,
        p.publico_alvo,
        p.unidade_assistencial_id,
        ua.nome_fantasia AS unidade_assistencial_nome,
        p.responsavel,
        p.equipe_envolvida,
        p.data_inicio,
        p.prazo_previsto,
        p.data_termino_real,
        p.prioridade,
        p.status,
        p.area_projeto,
        p.fonte_recurso,
        p.observacoes,
        p.ativo,
        p.created_at,
        p.updated_at,
        p.created_by,
        p.updated_by,
        COUNT(t.id)::BIGINT AS total_tarefas,
        COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::BIGINT AS tarefas_concluidas,
        CASE
          WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
        END AS percentual_evolucao
      FROM projetos p
      LEFT JOIN projeto_tarefas t
        ON t.projeto_id = p.id
       AND t.tenant_id::text = ${tenantId}
       AND t.ativo = TRUE
      LEFT JOIN unidade_assistencial ua
        ON ua.id = p.unidade_assistencial_id
       AND ua.tenant_id::text = ${tenantId}
      WHERE ${Prisma.raw(where.sql)}
      GROUP BY p.id, ua.nome_fantasia
      ORDER BY p.updated_at DESC, p.id DESC
    `);
        const tarefas = await this.listarTarefasPorTenant(tenantId);
        const historico = await this.listarHistoricoPorTenant(tenantId);
        return projetos.map((projeto) => ({
            projeto,
            tarefas: tarefas.filter((item) => item.projeto_id === projeto.id),
            historico: historico.filter((item) => item.projeto_id === projeto.id)
        }));
    }
    async dashboard(filters, tenantId) {
        await this.garantirEstrutura();
        const where = this.buildWhere(filters, tenantId, "p");
        const [resumo] = await prisma.$queryRaw(Prisma.sql `
      SELECT
        COUNT(*)::BIGINT AS total_projetos,
        COUNT(*) FILTER (WHERE p.status = 'EM_ANDAMENTO')::BIGINT AS projetos_em_andamento,
        COUNT(*) FILTER (WHERE p.status = 'PARADO')::BIGINT AS projetos_parados,
        COUNT(*) FILTER (WHERE p.status = 'CONCLUIDO')::BIGINT AS projetos_concluidos,
        COUNT(*) FILTER (
          WHERE p.status NOT IN ('CONCLUIDO', 'CANCELADO')
            AND p.prazo_previsto < CURRENT_DATE
        )::BIGINT AS projetos_atrasados,
        COALESCE(AVG(CASE
          WHEN totais.total_tarefas = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN totais.total_tarefas = 0 THEN 0
          ELSE ROUND((totais.tarefas_concluidas::numeric / NULLIF(totais.total_tarefas, 0)::numeric) * 100, 0)
        END), 0) AS percentual_medio_evolucao,
        COALESCE(SUM(totais.total_tarefas - totais.tarefas_concluidas), 0)::BIGINT AS tarefas_abertas,
        COALESCE(SUM(totais.tarefas_concluidas), 0)::BIGINT AS tarefas_concluidas
      FROM projetos p
      LEFT JOIN (
        SELECT
          projeto_id,
          COUNT(*)::BIGINT AS total_tarefas,
          COUNT(*) FILTER (WHERE status = 'CONCLUIDO')::BIGINT AS tarefas_concluidas
        FROM projeto_tarefas
        WHERE tenant_id::text = ${tenantId}
          AND ativo = TRUE
        GROUP BY projeto_id
      ) totais ON totais.projeto_id = p.id
      WHERE ${Prisma.raw(where.sql)}
    `);
        const porStatus = await prisma.$queryRaw(Prisma.sql `
      SELECT p.status AS chave, COUNT(*)::BIGINT AS total
      FROM projetos p
      WHERE ${Prisma.raw(where.sql)}
      GROUP BY p.status
      ORDER BY p.status
    `);
        const porPrioridade = await prisma.$queryRaw(Prisma.sql `
      SELECT p.prioridade AS chave, COUNT(*)::BIGINT AS total
      FROM projetos p
      WHERE ${Prisma.raw(where.sql)}
      GROUP BY p.prioridade
      ORDER BY p.prioridade
    `);
        const evolucao = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.nome AS chave,
        CASE
          WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
        END::BIGINT AS total
      FROM projetos p
      LEFT JOIN projeto_tarefas t
        ON t.projeto_id = p.id
       AND t.tenant_id::text = ${tenantId}
       AND t.ativo = TRUE
      WHERE ${Prisma.raw(where.sql)}
      GROUP BY p.id
      ORDER BY p.updated_at DESC
      LIMIT 8
    `);
        const tarefasPorResponsavel = await prisma.$queryRaw(Prisma.sql `
      SELECT COALESCE(NULLIF(TRIM(t.responsavel), ''), 'Não informado') AS chave, COUNT(*)::BIGINT AS total
      FROM projeto_tarefas t
      INNER JOIN projetos p
        ON p.id = t.projeto_id
       AND p.tenant_id::text = ${tenantId}
      WHERE t.tenant_id::text = ${tenantId}
        AND t.ativo = TRUE
        AND ${Prisma.raw(where.sql.replaceAll("p.", "p."))}
      GROUP BY COALESCE(NULLIF(TRIM(t.responsavel), ''), 'Não informado')
      ORDER BY total DESC, chave ASC
      LIMIT 8
    `);
        const vencimentos = await prisma.$queryRaw(Prisma.sql `
      SELECT faixa, COUNT(*)::BIGINT AS total
      FROM (
        SELECT
          CASE
            WHEN p.prazo_previsto BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 day' THEN '7 dias'
            WHEN p.prazo_previsto BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '15 day' THEN '15 dias'
            WHEN p.prazo_previsto BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 day' THEN '30 dias'
            ELSE NULL
          END AS faixa
        FROM projetos p
        WHERE ${Prisma.raw(where.sql)}
          AND p.status NOT IN ('CONCLUIDO', 'CANCELADO')
      ) base
      WHERE faixa IS NOT NULL
      GROUP BY faixa
      ORDER BY faixa
    `);
        return {
            resumo: {
                totalProjetos: Number(resumo?.total_projetos ?? 0),
                projetosEmAndamento: Number(resumo?.projetos_em_andamento ?? 0),
                projetosParados: Number(resumo?.projetos_parados ?? 0),
                projetosConcluidos: Number(resumo?.projetos_concluidos ?? 0),
                projetosAtrasados: Number(resumo?.projetos_atrasados ?? 0),
                percentualMedioEvolucao: Number(resumo?.percentual_medio_evolucao ?? 0),
                tarefasAbertas: Number(resumo?.tarefas_abertas ?? 0),
                tarefasConcluidas: Number(resumo?.tarefas_concluidas ?? 0)
            },
            graficos: {
                projetosPorStatus: porStatus.map((item) => ({ chave: item.chave, total: Number(item.total ?? 0) })),
                projetosPorPrioridade: porPrioridade.map((item) => ({ chave: item.chave, total: Number(item.total ?? 0) })),
                evolucaoProjetos: evolucao.map((item) => ({ chave: item.chave, total: Number(item.total ?? 0) })),
                tarefasPorResponsavel: tarefasPorResponsavel.map((item) => ({ chave: item.chave, total: Number(item.total ?? 0) })),
                projetosVencendo: vencimentos.map((item) => ({ faixa: item.faixa, total: Number(item.total ?? 0) }))
            }
        };
    }
    async buscarPorId(id, tenantId) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.tenant_id::text AS tenant_id,
        p.nome,
        p.descricao_completa,
        p.objetivo_geral,
        p.publico_alvo,
        p.unidade_assistencial_id,
        ua.nome_fantasia AS unidade_assistencial_nome,
        p.responsavel,
        p.equipe_envolvida,
        p.data_inicio,
        p.prazo_previsto,
        p.data_termino_real,
        p.prioridade,
        p.status,
        p.area_projeto,
        p.fonte_recurso,
        p.observacoes,
        p.ativo,
        p.created_at,
        p.updated_at,
        p.created_by,
        p.updated_by,
        COUNT(t.id)::BIGINT AS total_tarefas,
        COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::BIGINT AS tarefas_concluidas,
        CASE
          WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
        END AS percentual_evolucao
      FROM projetos p
      LEFT JOIN projeto_tarefas t
        ON t.projeto_id = p.id
       AND t.tenant_id::text = ${tenantId}
       AND t.ativo = TRUE
      LEFT JOIN unidade_assistencial ua
        ON ua.id = p.unidade_assistencial_id
       AND ua.tenant_id::text = ${tenantId}
      WHERE p.id = ${id}
        AND p.tenant_id::text = ${tenantId}
      GROUP BY p.id, ua.nome_fantasia
      LIMIT 1
    `);
        const projeto = rows[0];
        if (!projeto)
            return null;
        const tarefas = await this.listarTarefasPorProjeto(id, tenantId);
        const historico = await this.listarHistoricoProjeto(id, tenantId);
        return { projeto, tarefas, historico };
    }
    async buscarPorIdOuFalhar(id, tenantId) {
        const registro = await this.buscarPorId(id, tenantId);
        if (!registro)
            throw new AppError("Projeto não encontrado.", 404);
        return registro;
    }
    async criar(usuarioId, usuarioNome, input, tenantId) {
        await this.garantirEstrutura();
        await this.validarUnidadeAssistencial(input.unidade_assistencial_id, tenantId);
        const projetoId = await prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO projetos (
          tenant_id, nome, descricao_completa, objetivo_geral, publico_alvo, unidade_assistencial_id,
          responsavel, equipe_envolvida, data_inicio, prazo_previsto, data_termino_real,
          prioridade, status, area_projeto, fonte_recurso, observacoes, ativo, created_at, updated_at,
          created_by, updated_by
        ) VALUES (
          CAST(${tenantId} AS UUID), ${input.nome}, ${input.descricao_completa}, ${input.objetivo_geral},
          ${input.publico_alvo}, ${parseOptionalBigInt(input.unidade_assistencial_id)}, ${input.responsavel},
          ${JSON.stringify(input.equipe_envolvida ?? [])}::jsonb, ${toOptionalDate(input.data_inicio)}::date,
          ${toOptionalDate(input.prazo_previsto)}::date, ${toOptionalDate(input.data_termino_real)}::date,
          ${input.prioridade}, ${input.status}, ${input.area_projeto}, ${input.fonte_recurso}, ${input.observacoes},
          ${input.ativo ?? true}, NOW(), NOW(), ${usuarioId ?? null}, ${usuarioId ?? null}
        )
        RETURNING id
      `);
            const projetoId = inserted[0]?.id;
            if (!projetoId)
                throw new AppError("Não foi possível criar o projeto.", 500);
            await this.inserirHistoricoTx(tx, projetoId, null, "CRIACAO", "Projeto criado.", input, usuarioId, usuarioNome, tenantId);
            return projetoId;
        });
        return this.buscarPorIdOuFalhar(projetoId, tenantId);
    }
    async atualizar(id, usuarioId, usuarioNome, input, tenantId) {
        await this.garantirEstrutura();
        await this.validarUnidadeAssistencial(input.unidade_assistencial_id, tenantId);
        const existente = await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE projetos
        SET nome = ${input.nome},
            descricao_completa = ${input.descricao_completa},
            objetivo_geral = ${input.objetivo_geral},
            publico_alvo = ${input.publico_alvo},
            unidade_assistencial_id = ${parseOptionalBigInt(input.unidade_assistencial_id)},
            responsavel = ${input.responsavel},
            equipe_envolvida = ${JSON.stringify(input.equipe_envolvida ?? [])}::jsonb,
            data_inicio = ${toOptionalDate(input.data_inicio)}::date,
            prazo_previsto = ${toOptionalDate(input.prazo_previsto)}::date,
            data_termino_real = ${toOptionalDate(input.data_termino_real)}::date,
            prioridade = ${input.prioridade},
            status = ${input.status},
            area_projeto = ${input.area_projeto},
            fonte_recurso = ${input.fonte_recurso},
            observacoes = ${input.observacoes},
            ativo = ${input.ativo ?? true},
            updated_at = NOW(),
            updated_by = ${usuarioId ?? null}
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
            await this.inserirHistoricoTx(tx, id, null, "ALTERACAO", "Projeto atualizado.", {
                antes: existente.projeto,
                depois: input
            }, usuarioId, usuarioNome, tenantId);
            if (existente.projeto.status !== input.status) {
                await this.inserirHistoricoTx(tx, id, null, "STATUS", `Status alterado para ${input.status}.`, {
                    de: existente.projeto.status,
                    para: input.status
                }, usuarioId, usuarioNome, tenantId);
            }
            if (existente.projeto.prazo_previsto.toISOString().slice(0, 10) !== input.prazo_previsto) {
                await this.inserirHistoricoTx(tx, id, null, "PRAZO", "Prazo do projeto alterado.", {
                    de: existente.projeto.prazo_previsto,
                    para: input.prazo_previsto
                }, usuarioId, usuarioNome, tenantId);
            }
        });
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async inativar(id, usuarioId, usuarioNome, tenantId) {
        await this.garantirEstrutura();
        await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE projetos
        SET ativo = FALSE,
            updated_at = NOW(),
            updated_by = ${usuarioId ?? null}
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
            await this.inserirHistoricoTx(tx, id, null, "INATIVACAO", "Projeto inativado.", null, usuarioId, usuarioNome, tenantId);
        });
    }
    async listarHistorico(projetoId, tenantId) {
        await this.garantirEstrutura();
        return this.listarHistoricoProjeto(projetoId, tenantId);
    }
    async criarTarefa(projetoId, usuarioId, usuarioNome, input, tenantId) {
        await this.garantirEstrutura();
        await this.buscarPorIdOuFalhar(projetoId, tenantId);
        return prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO projeto_tarefas (
          tenant_id, projeto_id, titulo, descricao, tipo_tarefa, responsavel, prioridade,
          status, data_prevista, data_conclusao, observacoes, ordem_kanban, ativo,
          created_at, updated_at, created_by, updated_by
        ) VALUES (
          CAST(${tenantId} AS UUID), ${projetoId}, ${input.titulo}, ${input.descricao}, ${input.tipo_tarefa},
          ${input.responsavel}, ${input.prioridade}, ${input.status}, ${toOptionalDate(input.data_prevista)}::date,
          ${toOptionalDate(input.data_conclusao)}::date, ${input.observacoes}, ${input.ordem_kanban ?? 0},
          ${input.ativo ?? true}, NOW(), NOW(), ${usuarioId ?? null}, ${usuarioId ?? null}
        )
        RETURNING id
      `);
            const tarefaId = inserted[0]?.id;
            if (!tarefaId)
                throw new AppError("Não foi possível criar a tarefa do projeto.", 500);
            await this.touchProjetoTx(tx, projetoId, usuarioId, tenantId);
            await this.inserirHistoricoTx(tx, projetoId, tarefaId, "TAREFA_CRIADA", `Tarefa "${input.titulo}" criada.`, input, usuarioId, usuarioNome, tenantId);
            return this.buscarTarefaPorIdTx(tx, projetoId, tarefaId, tenantId);
        });
    }
    async atualizarTarefa(projetoId, tarefaId, usuarioId, usuarioNome, input, tenantId) {
        await this.garantirEstrutura();
        const existente = await this.buscarTarefaPorId(projetoId, tarefaId, tenantId);
        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE projeto_tarefas
        SET titulo = ${input.titulo},
            descricao = ${input.descricao},
            tipo_tarefa = ${input.tipo_tarefa},
            responsavel = ${input.responsavel},
            prioridade = ${input.prioridade},
            status = ${input.status},
            data_prevista = ${toOptionalDate(input.data_prevista)}::date,
            data_conclusao = ${toOptionalDate(input.data_conclusao)}::date,
            observacoes = ${input.observacoes},
            ordem_kanban = ${input.ordem_kanban ?? 0},
            ativo = ${input.ativo ?? true},
            updated_at = NOW(),
            updated_by = ${usuarioId ?? null}
        WHERE id = ${tarefaId}
          AND projeto_id = ${projetoId}
          AND tenant_id::text = ${tenantId}
      `);
            await this.touchProjetoTx(tx, projetoId, usuarioId, tenantId);
            await this.inserirHistoricoTx(tx, projetoId, tarefaId, "TAREFA_ALTERADA", `Tarefa "${input.titulo}" atualizada.`, {
                antes: existente,
                depois: input
            }, usuarioId, usuarioNome, tenantId);
            if (existente.status !== input.status) {
                await this.inserirHistoricoTx(tx, projetoId, tarefaId, "TAREFA_STATUS", `Tarefa movida para ${input.status}.`, {
                    de: existente.status,
                    para: input.status
                }, usuarioId, usuarioNome, tenantId);
            }
            if (existente.data_prevista?.toISOString().slice(0, 10) !== input.data_prevista) {
                await this.inserirHistoricoTx(tx, projetoId, tarefaId, "TAREFA_PRAZO", "Prazo da tarefa alterado.", {
                    de: existente.data_prevista,
                    para: input.data_prevista
                }, usuarioId, usuarioNome, tenantId);
            }
            return this.buscarTarefaPorIdTx(tx, projetoId, tarefaId, tenantId);
        });
    }
    async moverTarefa(projetoId, tarefaId, usuarioId, usuarioNome, status, tenantId) {
        await this.garantirEstrutura();
        const tarefa = await this.buscarTarefaPorId(projetoId, tarefaId, tenantId);
        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE projeto_tarefas
        SET status = ${status},
            data_conclusao = CASE WHEN ${status} = 'CONCLUIDO' THEN COALESCE(data_conclusao, CURRENT_DATE) ELSE NULL END,
            updated_at = NOW(),
            updated_by = ${usuarioId ?? null}
        WHERE id = ${tarefaId}
          AND projeto_id = ${projetoId}
          AND tenant_id::text = ${tenantId}
      `);
            await this.touchProjetoTx(tx, projetoId, usuarioId, tenantId);
            await this.inserirHistoricoTx(tx, projetoId, tarefaId, "KANBAN", `Tarefa "${tarefa.titulo}" movida para ${status}.`, {
                de: tarefa.status,
                para: status
            }, usuarioId, usuarioNome, tenantId);
            return this.buscarTarefaPorIdTx(tx, projetoId, tarefaId, tenantId);
        });
    }
    async listarTarefasPorTenant(tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        titulo,
        descricao,
        tipo_tarefa,
        responsavel,
        prioridade,
        status,
        data_prevista,
        data_conclusao,
        observacoes,
        ordem_kanban,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM projeto_tarefas
      WHERE tenant_id::text = ${tenantId}
        AND ativo = TRUE
      ORDER BY ordem_kanban ASC, updated_at DESC, id DESC
    `);
    }
    async listarHistoricoPorTenant(tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        tarefa_id,
        tipo_evento,
        descricao,
        detalhes_json,
        usuario_id,
        usuario_nome,
        created_at
      FROM projeto_historico
      WHERE tenant_id::text = ${tenantId}
      ORDER BY created_at DESC, id DESC
    `);
    }
    async listarTarefasPorProjeto(projetoId, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        titulo,
        descricao,
        tipo_tarefa,
        responsavel,
        prioridade,
        status,
        data_prevista,
        data_conclusao,
        observacoes,
        ordem_kanban,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM projeto_tarefas
      WHERE projeto_id = ${projetoId}
        AND tenant_id::text = ${tenantId}
        AND ativo = TRUE
      ORDER BY
        CASE status
          WHEN 'NAO_INICIADO' THEN 1
          WHEN 'EM_ANDAMENTO' THEN 2
          WHEN 'PARADO' THEN 3
          WHEN 'CONCLUIDO' THEN 4
          ELSE 9
        END,
        ordem_kanban ASC,
        updated_at DESC
    `);
    }
    async listarHistoricoProjeto(projetoId, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        tarefa_id,
        tipo_evento,
        descricao,
        detalhes_json,
        usuario_id,
        usuario_nome,
        created_at
      FROM projeto_historico
      WHERE projeto_id = ${projetoId}
        AND tenant_id::text = ${tenantId}
      ORDER BY created_at DESC, id DESC
    `);
    }
    async buscarTarefaPorId(projetoId, tarefaId, tenantId) {
        await this.garantirEstrutura();
        const row = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        titulo,
        descricao,
        tipo_tarefa,
        responsavel,
        prioridade,
        status,
        data_prevista,
        data_conclusao,
        observacoes,
        ordem_kanban,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM projeto_tarefas
      WHERE id = ${tarefaId}
        AND projeto_id = ${projetoId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        const tarefa = row[0];
        if (!tarefa)
            throw new AppError("Tarefa do projeto não encontrada.", 404);
        return tarefa;
    }
    async buscarTarefaPorIdTx(tx, projetoId, tarefaId, tenantId) {
        const row = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        projeto_id,
        titulo,
        descricao,
        tipo_tarefa,
        responsavel,
        prioridade,
        status,
        data_prevista,
        data_conclusao,
        observacoes,
        ordem_kanban,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM projeto_tarefas
      WHERE id = ${tarefaId}
        AND projeto_id = ${projetoId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        const tarefa = row[0];
        if (!tarefa)
            throw new AppError("Tarefa do projeto não encontrada.", 404);
        return tarefa;
    }
    async touchProjetoTx(tx, projetoId, usuarioId, tenantId) {
        await tx.$executeRaw(Prisma.sql `
      UPDATE projetos
      SET updated_at = NOW(),
          updated_by = ${usuarioId ?? null}
      WHERE id = ${projetoId}
        AND tenant_id::text = ${tenantId}
    `);
    }
    async inserirHistoricoTx(tx, projetoId, tarefaId, tipoEvento, descricao, detalhes, usuarioId, usuarioNome, tenantId) {
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO projeto_historico (
        tenant_id, projeto_id, tarefa_id, tipo_evento, descricao, detalhes_json, usuario_id, usuario_nome, created_at
      ) VALUES (
        CAST(${tenantId} AS UUID), ${projetoId}, ${tarefaId}, ${tipoEvento}, ${descricao},
        ${detalhes ? JSON.stringify(detalhes) : null}::jsonb, ${usuarioId ?? null}, ${usuarioNome ?? "Sistema"}, NOW()
      )
    `);
    }
    async validarUnidadeAssistencial(unidadeId, tenantId) {
        const parsedId = parseOptionalBigInt(unidadeId);
        if (!parsedId)
            return;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id
      FROM unidade_assistencial
      WHERE id = ${parsedId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        if (!rows[0]) {
            throw new AppError("A unidade assistencial informada não pertence à instituição autenticada.", 400);
        }
    }
    buildWhere(filters, tenantId, alias) {
        const conditions = [`${alias}.tenant_id::text = '${escapeSqlValue(tenantId)}'`];
        const nome = trimOrUndefined(filters.nome);
        if (filters.projeto_id) {
            const projetoId = Number(filters.projeto_id);
            if (!Number.isInteger(projetoId) || projetoId <= 0)
                throw new AppError("Projeto inválido.", 400);
            conditions.push(`${alias}.id = ${projetoId}`);
        }
        if (nome) {
            conditions.push(`${alias}.nome ILIKE '%${escapeSqlLike(nome)}%'`);
        }
        const responsavel = trimOrUndefined(filters.responsavel);
        if (responsavel) {
            conditions.push(`${alias}.responsavel ILIKE '%${escapeSqlLike(responsavel)}%'`);
        }
        if (filters.status)
            conditions.push(`${alias}.status = '${escapeSqlValue(filters.status)}'`);
        if (filters.prioridade)
            conditions.push(`${alias}.prioridade = '${escapeSqlValue(filters.prioridade)}'`);
        if (filters.area_projeto)
            conditions.push(`${alias}.area_projeto = '${escapeSqlValue(filters.area_projeto)}'`);
        if (filters.data_inicio_de)
            conditions.push(`${alias}.data_inicio >= DATE '${escapeSqlValue(filters.data_inicio_de)}'`);
        if (filters.data_inicio_ate)
            conditions.push(`${alias}.data_inicio <= DATE '${escapeSqlValue(filters.data_inicio_ate)}'`);
        if (filters.prazo_de)
            conditions.push(`${alias}.prazo_previsto >= DATE '${escapeSqlValue(filters.prazo_de)}'`);
        if (filters.prazo_ate)
            conditions.push(`${alias}.prazo_previsto <= DATE '${escapeSqlValue(filters.prazo_ate)}'`);
        if (filters.atrasados === true) {
            conditions.push(`${alias}.status NOT IN ('CONCLUIDO', 'CANCELADO')`);
            conditions.push(`${alias}.prazo_previsto < CURRENT_DATE`);
        }
        if (filters.concluidos === true) {
            conditions.push(`${alias}.status = 'CONCLUIDO'`);
        }
        if (filters.unidade_assistencial_id) {
            conditions.push(`${alias}.unidade_assistencial_id = ${Number(filters.unidade_assistencial_id)}`);
        }
        if (filters.ativo !== undefined) {
            conditions.push(`${alias}.ativo = ${filters.ativo ? "TRUE" : "FALSE"}`);
        }
        else {
            conditions.push(`${alias}.ativo = TRUE`);
        }
        return { sql: conditions.join(" AND ") };
    }
}
function parseOptionalBigInt(value) {
    if (!value?.trim())
        return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new AppError("Unidade assistencial inválida.", 400);
    }
    return BigInt(parsed);
}
function escapeSqlValue(value) {
    return value.replaceAll("'", "''");
}
function escapeSqlLike(value) {
    return escapeSqlValue(value).replaceAll("%", "\\%").replaceAll("_", "\\_");
}
