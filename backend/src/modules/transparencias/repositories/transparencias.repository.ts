import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  TransparenciaChecklistInput,
  TransparenciaChecklistRow,
  TransparenciaComprovanteInput,
  TransparenciaComprovanteRow,
  TransparenciaDestinacaoInput,
  TransparenciaDestinacaoRow,
  TransparenciaDespesaInput,
  TransparenciaDespesaRow,
  TransparenciaParecerHistoricoRow,
  TransparenciaInput,
  TransparenciaRecebimentoInput,
  TransparenciaRecebimentoRow,
  TransparenciaRow,
  TransparenciaTimelineInput,
  TransparenciaTimelineRow
} from "../transparencias.types.js";

type TransactionClient = Prisma.TransactionClient;

let estruturaPromise: Promise<void> | null = null;

const estruturaSql = [
  `CREATE TABLE IF NOT EXISTS transparencia_parecer_historico (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    transparencia_id BIGINT NOT NULL,
    versao INTEGER NOT NULL,
    conclusao VARCHAR(30),
    parecer_texto TEXT,
    ressalvas TEXT,
    recomendacoes TEXT,
    responsavel VARCHAR(180),
    data_parecer DATE,
    usuario_id VARCHAR(80),
    usuario_nome VARCHAR(180),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS transparencia_despesas (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    transparencia_id BIGINT NOT NULL,
    descricao VARCHAR(240) NOT NULL,
    fornecedor VARCHAR(180),
    documento_fiscal VARCHAR(100),
    data_pagamento DATE,
    categoria VARCHAR(120),
    valor NUMERIC(14,2),
    status VARCHAR(30) DEFAULT 'PENDENTE',
    ordem INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS transparencia_auditoria (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    transparencia_id BIGINT NOT NULL,
    acao VARCHAR(40) NOT NULL,
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30),
    usuario_id VARCHAR(80),
    usuario_nome VARCHAR(180),
    observacao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS instrumento VARCHAR(180)",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS objeto TEXT",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS periodo_inicio DATE",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS periodo_fim DATE",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS tipo_prestacao VARCHAR(20) DEFAULT 'FINAL'",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS status_workflow VARCHAR(30) DEFAULT 'RASCUNHO'",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW()",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT NOW()",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_conclusao VARCHAR(30)",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_texto TEXT",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_ressalvas TEXT",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_recomendacoes TEXT",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_responsavel VARCHAR(180)",
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS parecer_data DATE",
  "ALTER TABLE IF EXISTS transparencia_recebimentos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_destinacoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_comprovantes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_timelines ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_checklist ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_recebimentos ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE IF EXISTS transparencia_destinacoes ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE IF EXISTS transparencia_comprovantes ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE IF EXISTS transparencia_timelines ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE IF EXISTS transparencia_checklist ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0",
  "CREATE INDEX IF NOT EXISTS transparencia_despesas_tenant_idx ON transparencia_despesas(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_parecer_historico_tenant_idx ON transparencia_parecer_historico(tenant_id, transparencia_id, versao DESC)",
  "CREATE INDEX IF NOT EXISTS transparencia_tenant_idx ON transparencia(tenant_id, id DESC)",
  "CREATE INDEX IF NOT EXISTS transparencia_recebimentos_tenant_idx ON transparencia_recebimentos(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_destinacoes_tenant_idx ON transparencia_destinacoes(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_comprovantes_tenant_idx ON transparencia_comprovantes(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_timelines_tenant_idx ON transparencia_timelines(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_checklist_tenant_idx ON transparencia_checklist(tenant_id, transparencia_id, id)"
  ,"CREATE INDEX IF NOT EXISTS transparencia_auditoria_tenant_idx ON transparencia_auditoria(tenant_id, transparencia_id, criado_em DESC)"
];

async function ensureTransparenciasEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia AS t
        SET tenant_id = u.tenant_id
        FROM unidade_assistencial AS u
        WHERE t.tenant_id IS NULL
          AND t.unidade_id = u.id
          AND u.tenant_id IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia_recebimentos AS r
        SET tenant_id = t.tenant_id
        FROM transparencia AS t
        WHERE r.tenant_id IS NULL
          AND r.transparencia_id = t.id
          AND t.tenant_id IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia_destinacoes AS d
        SET tenant_id = t.tenant_id
        FROM transparencia AS t
        WHERE d.tenant_id IS NULL
          AND d.transparencia_id = t.id
          AND t.tenant_id IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia_comprovantes AS c
        SET tenant_id = t.tenant_id
        FROM transparencia AS t
        WHERE c.tenant_id IS NULL
          AND c.transparencia_id = t.id
          AND t.tenant_id IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia_timelines AS tl
        SET tenant_id = t.tenant_id
        FROM transparencia AS t
        WHERE tl.tenant_id IS NULL
          AND tl.transparencia_id = t.id
          AND t.tenant_id IS NOT NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE transparencia_checklist AS cl
        SET tenant_id = t.tenant_id
        FROM transparencia AS t
        WHERE cl.tenant_id IS NULL
          AND cl.transparencia_id = t.id
          AND t.tenant_id IS NOT NULL
      `);
    })();
  }

  await estruturaPromise;
}

function tenantFilter(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

export class TransparenciasRepository {
  async listar(tenantId: string) {
    await ensureTransparenciasEstrutura();
    await this.sincronizarInstrumentosProfissionais(tenantId);

    const transparencias = await prisma.$queryRaw<TransparenciaRow[]>(Prisma.sql`
      SELECT
        id,
        unidade_id,
        instrumento,
        objeto,
        periodo_inicio,
        periodo_fim,
        tipo_prestacao,
        COALESCE(status_workflow, 'RASCUNHO') AS status_workflow,
        criado_em,
        atualizado_em,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
        ,parecer_conclusao, parecer_texto, parecer_ressalvas, parecer_recomendacoes, parecer_responsavel, parecer_data
      FROM transparencia AS t
      WHERE ${tenantFilter("t", tenantId)}
      ORDER BY t.id DESC
    `);

    const ids = transparencias.map((item) => item.id);
    const recebimentos = ids.length ? await this.listarRecebimentos(ids, tenantId) : [];
    const destinacoes = ids.length ? await this.listarDestinacoes(ids, tenantId) : [];
    const comprovantes = ids.length ? await this.listarComprovantes(ids, tenantId) : [];
    const timelines = ids.length ? await this.listarTimelines(ids, tenantId) : [];
    const checklist = ids.length ? await this.listarChecklist(ids, tenantId) : [];
    const despesas = ids.length ? await this.listarDespesas(ids, tenantId) : [];
    const parecerHistorico = ids.length ? await this.listarParecerHistorico(ids, tenantId) : [];

    return transparencias.map((transparencia) => ({
      transparencia,
      recebimentos,
      destinacoes,
      comprovantes,
      timelines,
      checklist
      ,despesas, parecerHistorico
    }));
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await ensureTransparenciasEstrutura();
    await this.sincronizarInstrumentosProfissionais(tenantId);

    const rows = await prisma.$queryRaw<TransparenciaRow[]>(Prisma.sql`
      SELECT
        id,
        unidade_id,
        instrumento,
        objeto,
        periodo_inicio,
        periodo_fim,
        tipo_prestacao,
        COALESCE(status_workflow, 'RASCUNHO') AS status_workflow,
        criado_em,
        atualizado_em,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
        ,parecer_conclusao, parecer_texto, parecer_ressalvas, parecer_recomendacoes, parecer_responsavel, parecer_data
      FROM transparencia AS t
      WHERE t.id = ${id}
        AND ${tenantFilter("t", tenantId)}
      LIMIT 1
    `);

    const transparencia = rows[0] ?? null;
    if (!transparencia) return null;

    const recebimentos = await this.listarRecebimentos([id], tenantId);
    const destinacoes = await this.listarDestinacoes([id], tenantId);
    const comprovantes = await this.listarComprovantes([id], tenantId);
    const timelines = await this.listarTimelines([id], tenantId);
    const checklist = await this.listarChecklist([id], tenantId);
    const despesas = await this.listarDespesas([id], tenantId);
    const parecerHistorico = await this.listarParecerHistorico([id], tenantId);

    return {
      transparencia,
      recebimentos,
      destinacoes,
      comprovantes,
      timelines,
      checklist
      ,despesas, parecerHistorico
    };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) throw new AppError("Registro de prestacao de contas nao encontrado.", 404);
    return registro;
  }

  async criar(input: TransparenciaInput, tenantId: string) {
    await ensureTransparenciasEstrutura();

    const unidadeId = await this.validarUnidade(input.unidadeId, tenantId);
    const id = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO transparencia (
          tenant_id,
          unidade_id,
          instrumento,
          objeto,
          periodo_inicio,
          periodo_fim,
          tipo_prestacao,
          status_workflow,
          total_recebido,
          total_recebido_helper,
          total_aplicado,
          total_aplicado_helper,
          saldo_disponivel,
          saldo_disponivel_helper,
          prestado_mes,
          prestado_mes_helper,
          parecer_conclusao,
          parecer_texto,
          parecer_ressalvas,
          parecer_recomendacoes,
          parecer_responsavel,
          parecer_data,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${unidadeId},
          ${trimOrUndefined(input.instrumento ?? undefined)},
          ${trimOrUndefined(input.objeto ?? undefined)},
          ${input.periodoInicio ?? null},
          ${input.periodoFim ?? null},
          ${input.tipoPrestacao ?? "FINAL"},
          'RASCUNHO',
          ${input.totalRecebido ?? null},
          ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          ${input.totalAplicado ?? null},
          ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          ${input.saldoDisponivel ?? null},
          ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          ${input.prestadoMes ?? null},
          ${trimOrUndefined(input.prestadoMesHelper ?? undefined)},
          ${input.parecerConclusao ?? null},
          ${trimOrUndefined(input.parecerTexto ?? undefined)},
          ${trimOrUndefined(input.parecerRessalvas ?? undefined)},
          ${trimOrUndefined(input.parecerRecomendacoes ?? undefined)},
          ${trimOrUndefined(input.parecerResponsavel ?? undefined)},
          ${input.parecerData ?? null},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const transparenciaId = rows[0]?.id;
      if (!transparenciaId) throw new AppError("Nao foi possivel criar registro de prestacao de contas.", 500);

      await this.salvarRelacionamentos(tx, transparenciaId, input, tenantId);
      return transparenciaId;
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: TransparenciaInput, tenantId: string, usuarioId?: string, usuarioNome?: string) {
    await ensureTransparenciasEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    const unidadeId = await this.validarUnidade(input.unidadeId, tenantId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE transparencia AS t
        SET
          unidade_id = ${unidadeId},
          instrumento = ${trimOrUndefined(input.instrumento ?? undefined)},
          objeto = ${trimOrUndefined(input.objeto ?? undefined)},
          periodo_inicio = ${input.periodoInicio ?? null},
          periodo_fim = ${input.periodoFim ?? null},
          tipo_prestacao = ${input.tipoPrestacao ?? "FINAL"},
          atualizado_em = NOW(),
          total_recebido = ${input.totalRecebido ?? null},
          total_recebido_helper = ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          total_aplicado = ${input.totalAplicado ?? null},
          total_aplicado_helper = ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          saldo_disponivel = ${input.saldoDisponivel ?? null},
          saldo_disponivel_helper = ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          prestado_mes = ${input.prestadoMes ?? null},
          prestado_mes_helper = ${trimOrUndefined(input.prestadoMesHelper ?? undefined)}
          ,parecer_conclusao = ${input.parecerConclusao ?? null}
          ,parecer_texto = ${trimOrUndefined(input.parecerTexto ?? undefined)}
          ,parecer_ressalvas = ${trimOrUndefined(input.parecerRessalvas ?? undefined)}
          ,parecer_recomendacoes = ${trimOrUndefined(input.parecerRecomendacoes ?? undefined)}
          ,parecer_responsavel = ${trimOrUndefined(input.parecerResponsavel ?? undefined)}
          ,parecer_data = ${input.parecerData ?? null}
        WHERE t.id = ${id}
          AND ${tenantFilter("t", tenantId)}
      `);

      await this.salvarRelacionamentos(tx, id, input, tenantId, usuarioId, usuarioNome);
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string) {
    await ensureTransparenciasEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM transparencia AS t
      WHERE t.id = ${id}
        AND ${tenantFilter("t", tenantId)}
    `);
  }

  async atualizarStatusWorkflow(
    id: bigint,
    status: string,
    tenantId: string,
    usuarioId?: string,
    usuarioNome?: string,
    observacao?: string
  ) {
    await ensureTransparenciasEstrutura();
    const atual = await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE transparencia
        SET status_workflow = ${status}, atualizado_em = NOW()
        WHERE id = ${id} AND tenant_id::text = ${tenantId}
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_auditoria
          (tenant_id, transparencia_id, acao, status_anterior, status_novo, usuario_id, usuario_nome, observacao)
        VALUES
          (${tenantId}::uuid, ${id}, 'ALTERAR_STATUS', ${atual.transparencia.status_workflow ?? "RASCUNHO"}, ${status}, ${usuarioId ?? null}, ${usuarioNome ?? null}, ${observacao ?? null})
      `);
    });
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  private async validarUnidade(unidadeId: string | null | undefined, tenantId: string) {
    if (!unidadeId) {
      return null;
    }

    const parsed = Number(unidadeId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Unidade informada invalida.", 400);
    }

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM unidade_assistencial
      WHERE id = ${BigInt(parsed)}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const unidade = rows[0];
    if (!unidade) {
      throw new AppError("A unidade informada nao pertence a instituicao autenticada.", 403);
    }

    return unidade.id;
  }

  private async sincronizarInstrumentosProfissionais(tenantId: string) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO transparencia (
        tenant_id,
        unidade_id,
        prestacao_instrumento_id,
        percentual_preenchimento,
        proxima_prestacao_em,
        instrumento,
        objeto,
        periodo_inicio,
        periodo_fim,
        tipo_prestacao,
        status_workflow,
        total_recebido,
        total_recebido_helper,
        total_aplicado,
        total_aplicado_helper,
        saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes,
        prestado_mes_helper,
        parecer_conclusao,
        parecer_texto,
        parecer_ressalvas,
        parecer_recomendacoes,
        parecer_responsavel,
        parecer_data,
        criado_em,
        atualizado_em
      )
      SELECT
        i.tenant_id,
        i.unidade_id,
        i.id,
        100,
        COALESCE(i.termino_vigencia + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days')::date,
        COALESCE(i.numero_instrumento, CONCAT(i.tipo_instrumento, ' ', i.id::text)),
        i.objeto,
        i.inicio_vigencia,
        i.termino_vigencia,
        CASE
          WHEN i.situacao ILIKE '%PARCIAL%' THEN 'PARCIAL'
          WHEN i.situacao ILIKE '%ANUAL%' THEN 'ANUAL'
          ELSE 'FINAL'
        END,
        CASE
          WHEN i.situacao IN ('APROVADA', 'APROVADO') THEN 'APROVADA'
          WHEN i.situacao IN ('APROVADA_RESSALVAS', 'APROVADO_RESSALVAS') THEN 'APROVADA_RESSALVAS'
          WHEN i.situacao ILIKE '%DILIGENCIA%' THEN 'EM_DILIGENCIA'
          WHEN i.situacao ILIKE '%ANALISE%' THEN 'EM_ANALISE'
          ELSE 'RASCUNHO'
        END,
        COALESCE((
          SELECT SUM(r.valor_recebido)
          FROM prestacao_contas_receita r
          WHERE r.tenant_id = i.tenant_id
            AND r.instrumento_id = i.id
            AND r.excluido_em IS NULL
        ), i.valor_repasse, 0),
        'Total sincronizado a partir dos recebimentos profissionais da prestação.',
        COALESCE((
          SELECT SUM(d.valor_liquido)
          FROM prestacao_contas_despesa d
          WHERE d.tenant_id = i.tenant_id
            AND d.instrumento_id = i.id
            AND d.excluido_em IS NULL
        ), 0),
        'Total sincronizado a partir das despesas profissionais da prestação.',
        COALESCE((
          SELECT SUM(r.valor_recebido)
          FROM prestacao_contas_receita r
          WHERE r.tenant_id = i.tenant_id
            AND r.instrumento_id = i.id
            AND r.excluido_em IS NULL
        ), i.valor_repasse, 0) - COALESCE((
          SELECT SUM(d.valor_liquido)
          FROM prestacao_contas_despesa d
          WHERE d.tenant_id = i.tenant_id
            AND d.instrumento_id = i.id
            AND d.excluido_em IS NULL
        ), 0),
        'Saldo sincronizado automaticamente para exibição na listagem.',
        COALESCE((
          SELECT SUM(d.valor_liquido)
          FROM prestacao_contas_despesa d
          WHERE d.tenant_id = i.tenant_id
            AND d.instrumento_id = i.id
            AND d.excluido_em IS NULL
            AND d.data_pagamento >= date_trunc('month', CURRENT_DATE)::date
        ), 0),
        'Valor aplicado no mês atual conforme despesas profissionais.',
        CASE WHEN EXISTS (
          SELECT 1
          FROM prestacao_contas_aprovacao a
          WHERE a.tenant_id = i.tenant_id
            AND a.instrumento_id = i.id
            AND a.decisao = 'APROVADO_RESSALVAS'
            AND a.excluido_em IS NULL
        ) THEN 'APROVAR_RESSALVAS' ELSE 'APROVAR' END,
        'Registro sincronizado automaticamente a partir da prestação profissional para exibição na listagem principal.',
        CASE WHEN EXISTS (
          SELECT 1
          FROM prestacao_contas_aprovacao a
          WHERE a.tenant_id = i.tenant_id
            AND a.instrumento_id = i.id
            AND a.decisao = 'APROVADO_RESSALVAS'
            AND a.excluido_em IS NULL
        ) THEN 'Há ressalvas registradas na aprovação profissional.' ELSE NULL END,
        'Conferir documentos, despesas, conciliações e pareceres antes do encerramento.',
        COALESCE(i.atualizado_por, i.criado_por),
        CURRENT_DATE,
        NOW(),
        NOW()
      FROM prestacao_contas_instrumento i
      WHERE i.tenant_id::text = ${tenantId}
        AND i.excluido_em IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM transparencia t
          WHERE t.tenant_id = i.tenant_id
            AND (
              t.prestacao_instrumento_id = i.id
              OR (
                t.instrumento IS NOT NULL
                AND i.numero_instrumento IS NOT NULL
                AND t.instrumento = i.numero_instrumento
              )
            )
        )
    `);
  }

  private async listarRecebimentos(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaRecebimentoRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        fonte,
        valor::float8 AS valor,
        periodicidade,
        status,
        ordem
      FROM transparencia_recebimentos AS r
      WHERE r.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("r", tenantId)}
      ORDER BY r.transparencia_id, r.ordem, r.id
    `);
  }

  private async listarDestinacoes(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaDestinacaoRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        percentual::float8 AS percentual,
        ordem
      FROM transparencia_destinacoes AS d
      WHERE d.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("d", tenantId)}
      ORDER BY d.transparencia_id, d.ordem, d.id
    `);
  }

  private async listarComprovantes(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaComprovanteRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        arquivo_nome,
        arquivo_url,
        ordem
      FROM transparencia_comprovantes AS c
      WHERE c.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("c", tenantId)}
      ORDER BY c.transparencia_id, c.ordem, c.id
    `);
  }

  private async listarTimelines(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaTimelineRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        titulo,
        detalhe,
        status,
        ordem
      FROM transparencia_timelines AS tl
      WHERE tl.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("tl", tenantId)}
      ORDER BY tl.transparencia_id, tl.ordem, tl.id
    `);
  }

  private async listarChecklist(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaChecklistRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        status,
        ordem
      FROM transparencia_checklist AS cl
      WHERE cl.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("cl", tenantId)}
      ORDER BY cl.transparencia_id, cl.ordem, cl.id
    `);
  }

  private async listarDespesas(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaDespesaRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        descricao,
        fornecedor,
        documento_fiscal,
        data_pagamento,
        categoria,
        valor::float8 AS valor,
        status,
        ordem
      FROM transparencia_despesas AS d
      WHERE d.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("d", tenantId)}
      ORDER BY d.transparencia_id, d.data_pagamento, d.ordem, d.id
    `);
  }

  private async listarParecerHistorico(ids: bigint[], tenantId: string) {
    return prisma.$queryRaw<TransparenciaParecerHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        transparencia_id,
        versao,
        conclusao,
        parecer_texto,
        ressalvas,
        recomendacoes,
        responsavel,
        data_parecer,
        usuario_id,
        usuario_nome,
        criado_em
      FROM transparencia_parecer_historico AS ph
      WHERE ph.transparencia_id IN (${Prisma.join(ids)})
        AND ${tenantFilter("ph", tenantId)}
      ORDER BY ph.transparencia_id, ph.versao DESC
    `);
  }

  private async salvarRelacionamentos(
    tx: TransactionClient,
    transparenciaId: bigint,
    input: TransparenciaInput,
    tenantId: string,
    usuarioId?: string,
    usuarioNome?: string
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_recebimentos AS r
      WHERE r.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("r", tenantId)}
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_destinacoes AS d
      WHERE d.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("d", tenantId)}
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_comprovantes AS c
      WHERE c.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("c", tenantId)}
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_timelines AS tl
      WHERE tl.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("tl", tenantId)}
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_checklist AS cl
      WHERE cl.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("cl", tenantId)}
    `);

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM transparencia_despesas AS d
      WHERE d.transparencia_id = ${transparenciaId}
        AND ${tenantFilter("d", tenantId)}
    `);

    await this.inserirRecebimentos(tx, transparenciaId, input.recebimentos ?? [], tenantId);
    await this.inserirDestinacoes(tx, transparenciaId, input.destinacoes ?? [], tenantId);
    await this.inserirComprovantes(tx, transparenciaId, input.comprovantes ?? [], tenantId);
    await this.inserirTimelines(tx, transparenciaId, input.timelines ?? [], tenantId);
    await this.inserirChecklist(tx, transparenciaId, input.checklist ?? [], tenantId);
    await this.inserirDespesas(tx, transparenciaId, input.despesas ?? [], tenantId);
    if (input.parecerTexto?.trim() || input.parecerConclusao) {
      await this.registrarParecerHistorico(tx, transparenciaId, input, tenantId, usuarioId, usuarioNome);
    }
  }

  private async registrarParecerHistorico(
    tx: TransactionClient,
    transparenciaId: bigint,
    input: TransparenciaInput,
    tenantId: string,
    usuarioId?: string,
    usuarioNome?: string
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO transparencia_parecer_historico (
        tenant_id, transparencia_id, versao, conclusao, parecer_texto, ressalvas,
        recomendacoes, responsavel, data_parecer, usuario_id, usuario_nome
      ) VALUES (
        ${tenantId}::uuid,
        ${transparenciaId},
        COALESCE((SELECT MAX(versao) + 1 FROM transparencia_parecer_historico WHERE transparencia_id = ${transparenciaId} AND tenant_id::text = ${tenantId}), 1),
        ${input.parecerConclusao ?? null},
        ${trimOrUndefined(input.parecerTexto ?? undefined)},
        ${trimOrUndefined(input.parecerRessalvas ?? undefined)},
        ${trimOrUndefined(input.parecerRecomendacoes ?? undefined)},
        ${trimOrUndefined(input.parecerResponsavel ?? undefined)},
        ${input.parecerData ?? null},
        ${usuarioId ?? null},
        ${usuarioNome ?? null}
      )
    `);
  }

  private async inserirRecebimentos(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaRecebimentoInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_recebimentos (
          tenant_id,
          transparencia_id,
          fonte,
          valor,
          periodicidade,
          status,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.fonte},
          ${item.valor ?? null},
          ${trimOrUndefined(item.periodicidade ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
    }
  }

  private async inserirDestinacoes(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaDestinacaoInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_destinacoes (
          tenant_id,
          transparencia_id,
          titulo,
          descricao,
          percentual,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${item.percentual ?? null},
          ${index}
        )
      `);
    }
  }

  private async inserirComprovantes(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaComprovanteInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_comprovantes (
          tenant_id,
          transparencia_id,
          titulo,
          descricao,
          arquivo_nome,
          arquivo_url,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${trimOrUndefined(item.arquivoNome ?? undefined)},
          ${trimOrUndefined(item.arquivoUrl ?? undefined)},
          ${index}
        )
      `);
    }
  }

  private async inserirTimelines(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaTimelineInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_timelines (
          tenant_id,
          transparencia_id,
          titulo,
          detalhe,
          status,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.detalhe ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
    }
  }

  private async inserirChecklist(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaChecklistInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_checklist (
          tenant_id,
          transparencia_id,
          titulo,
          descricao,
          status,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
    }
  }

  private async inserirDespesas(
    tx: TransactionClient,
    transparenciaId: bigint,
    lista: TransparenciaDespesaInput[],
    tenantId: string
  ) {
    for (let index = 0; index < lista.length; index += 1) {
      const item = lista[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO transparencia_despesas (
          tenant_id,
          transparencia_id,
          descricao,
          fornecedor,
          documento_fiscal,
          data_pagamento,
          categoria,
          valor,
          status,
          ordem
        ) VALUES (
          ${tenantId}::uuid,
          ${transparenciaId},
          ${item.descricao},
          ${trimOrUndefined(item.fornecedor ?? undefined)},
          ${trimOrUndefined(item.documentoFiscal ?? undefined)},
          ${item.dataPagamento ?? null},
          ${trimOrUndefined(item.categoria ?? undefined)},
          ${item.valor ?? null},
          ${trimOrUndefined(item.status ?? undefined) ?? "PENDENTE"},
          ${index}
        )
      `);
    }
  }
}
