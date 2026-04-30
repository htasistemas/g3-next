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
  "ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_recebimentos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_destinacoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_comprovantes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_timelines ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS transparencia_checklist ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS transparencia_tenant_idx ON transparencia(tenant_id, id DESC)",
  "CREATE INDEX IF NOT EXISTS transparencia_recebimentos_tenant_idx ON transparencia_recebimentos(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_destinacoes_tenant_idx ON transparencia_destinacoes(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_comprovantes_tenant_idx ON transparencia_comprovantes(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_timelines_tenant_idx ON transparencia_timelines(tenant_id, transparencia_id, id)",
  "CREATE INDEX IF NOT EXISTS transparencia_checklist_tenant_idx ON transparencia_checklist(tenant_id, transparencia_id, id)"
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

    const transparencias = await prisma.$queryRaw<TransparenciaRow[]>(Prisma.sql`
      SELECT
        id,
        unidade_id,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
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

    return transparencias.map((transparencia) => ({
      transparencia,
      recebimentos,
      destinacoes,
      comprovantes,
      timelines,
      checklist
    }));
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await ensureTransparenciasEstrutura();

    const rows = await prisma.$queryRaw<TransparenciaRow[]>(Prisma.sql`
      SELECT
        id,
        unidade_id,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
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

    return {
      transparencia,
      recebimentos,
      destinacoes,
      comprovantes,
      timelines,
      checklist
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
          total_recebido,
          total_recebido_helper,
          total_aplicado,
          total_aplicado_helper,
          saldo_disponivel,
          saldo_disponivel_helper,
          prestado_mes,
          prestado_mes_helper,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${unidadeId},
          ${input.totalRecebido ?? null},
          ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          ${input.totalAplicado ?? null},
          ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          ${input.saldoDisponivel ?? null},
          ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          ${input.prestadoMes ?? null},
          ${trimOrUndefined(input.prestadoMesHelper ?? undefined)},
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

  async atualizar(id: bigint, input: TransparenciaInput, tenantId: string) {
    await ensureTransparenciasEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    const unidadeId = await this.validarUnidade(input.unidadeId, tenantId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE transparencia AS t
        SET
          unidade_id = ${unidadeId},
          total_recebido = ${input.totalRecebido ?? null},
          total_recebido_helper = ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          total_aplicado = ${input.totalAplicado ?? null},
          total_aplicado_helper = ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          saldo_disponivel = ${input.saldoDisponivel ?? null},
          saldo_disponivel_helper = ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          prestado_mes = ${input.prestadoMes ?? null},
          prestado_mes_helper = ${trimOrUndefined(input.prestadoMesHelper ?? undefined)},
          atualizado_em = NOW()
        WHERE t.id = ${id}
          AND ${tenantFilter("t", tenantId)}
      `);

      await this.salvarRelacionamentos(tx, id, input, tenantId);
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

  private async salvarRelacionamentos(
    tx: TransactionClient,
    transparenciaId: bigint,
    input: TransparenciaInput,
    tenantId: string
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

    await this.inserirRecebimentos(tx, transparenciaId, input.recebimentos ?? [], tenantId);
    await this.inserirDestinacoes(tx, transparenciaId, input.destinacoes ?? [], tenantId);
    await this.inserirComprovantes(tx, transparenciaId, input.comprovantes ?? [], tenantId);
    await this.inserirTimelines(tx, transparenciaId, input.timelines ?? [], tenantId);
    await this.inserirChecklist(tx, transparenciaId, input.checklist ?? [], tenantId);
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
}
