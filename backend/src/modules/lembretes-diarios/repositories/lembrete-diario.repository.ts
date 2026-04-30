import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  LembreteDiarioAdiarInput,
  LembreteDiarioInput,
  LembreteDiarioRow
} from "../lembrete-diario.types.js";

type LembreteResumoRow = {
  total_pendentes: bigint | number | null;
  total_vencidos: bigint | number | null;
};

function montarDataHoraProxima(dataInicial: string, horaAviso?: string | null) {
  const hora = trimOrUndefined(horaAviso) ?? "09:00";
  return new Date(`${dataInicial}T${hora}:00`);
}

const estruturaSql = [
  "ALTER TABLE lembretes_diarios ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS lembretes_diarios_tenant_idx ON lembretes_diarios(tenant_id, proxima_execucao_em ASC, id DESC)",
  `
    UPDATE lembretes_diarios AS l
    SET tenant_id = u.tenant_id
    FROM usuarios u
    WHERE l.tenant_id IS NULL
      AND l.usuario_id IS NOT NULL
      AND u.id = l.usuario_id
      AND u.tenant_id IS NOT NULL
  `,
  `
    UPDATE lembretes_diarios AS l
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE l.tenant_id IS NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class LembreteDiarioRepository {
  private async garantirEstrutura() {
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

  async listar(usuarioId: number | undefined, tenantId: string) {
    await this.garantirEstrutura();
    const filtroUsuario = usuarioId
      ? Prisma.sql`AND (usuario_id = ${BigInt(usuarioId)} OR todos_usuarios = TRUE)`
      : Prisma.empty;

    return prisma.$queryRaw<LembreteDiarioRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        data_inicial,
        usuario_id,
        todos_usuarios,
        recorrencia,
        hora_aviso,
        status,
        proxima_execucao_em,
        adiado_ate,
        concluido_em,
        criado_em,
        atualizado_em
      FROM lembretes_diarios
      WHERE deletado_em IS NULL
        AND tenant_id::text = ${tenantId}
      ${filtroUsuario}
      ORDER BY proxima_execucao_em ASC, id DESC
    `);
  }

  async obterResumo(usuarioId: number | undefined, tenantId: string) {
    await this.garantirEstrutura();
    const filtroUsuario = usuarioId
      ? Prisma.sql`AND (usuario_id = ${BigInt(usuarioId)} OR todos_usuarios = TRUE)`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<LembreteResumoRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'CONCLUIDO')::BIGINT AS total_pendentes,
        COUNT(*) FILTER (
          WHERE status IS DISTINCT FROM 'CONCLUIDO'
            AND COALESCE(
              proxima_execucao_em,
              data_inicial + COALESCE(hora_aviso, TIME '09:00')
            ) <= NOW()
        )::BIGINT AS total_vencidos
      FROM lembretes_diarios
      WHERE deletado_em IS NULL
        AND tenant_id::text = ${tenantId}
      ${filtroUsuario}
    `);

    const row = rows[0];
    return {
      totalPendentes: Number(row?.total_pendentes ?? 0),
      totalVencidos: Number(row?.total_vencidos ?? 0)
    };
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<LembreteDiarioRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        data_inicial,
        usuario_id,
        todos_usuarios,
        recorrencia,
        hora_aviso,
        status,
        proxima_execucao_em,
        adiado_ate,
        concluido_em,
        criado_em,
        atualizado_em
      FROM lembretes_diarios
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Lembrete nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: LembreteDiarioInput, tenantId: string) {
    await this.garantirEstrutura();
    const recorrencia = "DIARIO";
    const proximaExecucao = montarDataHoraProxima(input.dataInicial, input.horaAviso);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO lembretes_diarios (
        tenant_id,
        titulo,
        descricao,
        usuario_id,
        todos_usuarios,
        data_inicial,
        recorrencia,
        hora_aviso,
        status,
        proxima_execucao_em,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.titulo},
        ${trimOrUndefined(input.descricao)},
        ${input.usuarioId ? BigInt(input.usuarioId) : null},
        ${!!input.todosUsuarios},
        ${toOptionalDate(input.dataInicial)},
        ${recorrencia},
        CAST(${trimOrUndefined(input.horaAviso ?? undefined) ?? null} AS TIME),
        'PENDENTE',
        ${proximaExecucao},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar o lembrete.", 500);
    }
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: LembreteDiarioInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    const proximaExecucao = montarDataHoraProxima(input.dataInicial, input.horaAviso);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        titulo = ${input.titulo},
        descricao = ${trimOrUndefined(input.descricao)},
        usuario_id = ${input.usuarioId ? BigInt(input.usuarioId) : null},
        todos_usuarios = ${!!input.todosUsuarios},
        data_inicial = ${toOptionalDate(input.dataInicial)},
        hora_aviso = CAST(${trimOrUndefined(input.horaAviso ?? undefined) ?? null} AS TIME),
        proxima_execucao_em = ${proximaExecucao},
        status = CASE WHEN status = 'CONCLUIDO' THEN 'PENDENTE' ELSE status END,
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async concluir(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        status = 'CONCLUIDO',
        concluido_em = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async adiar(id: bigint, input: LembreteDiarioAdiarInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    const novaData = new Date(input.novaDataHora);
    if (Number.isNaN(novaData.getTime())) {
      throw new AppError("Nova data para adiar invalida.", 400);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        adiado_ate = ${novaData},
        proxima_execucao_em = ${novaData},
        status = 'PENDENTE',
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async excluir(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        deletado_em = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }
}
