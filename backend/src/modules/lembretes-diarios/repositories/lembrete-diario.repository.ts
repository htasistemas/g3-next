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

const sqlEstrutura = [
  `
    CREATE TABLE IF NOT EXISTS lembretes_diarios (
      id BIGSERIAL PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      descricao TEXT,
      usuario_id BIGINT,
      todos_usuarios BOOLEAN NOT NULL DEFAULT FALSE,
      data_inicial DATE NOT NULL,
      recorrencia VARCHAR(20) NOT NULL,
      hora_aviso TIME,
      status VARCHAR(20) NOT NULL,
      proxima_execucao_em TIMESTAMP NOT NULL,
      adiado_ate TIMESTAMP,
      concluido_em TIMESTAMP,
      deletado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  `
    ALTER TABLE lembretes_diarios
      ADD COLUMN IF NOT EXISTS usuario_id BIGINT;
  `,
  `
    ALTER TABLE lembretes_diarios
      ADD COLUMN IF NOT EXISTS todos_usuarios BOOLEAN NOT NULL DEFAULT FALSE;
  `,
  `
    CREATE INDEX IF NOT EXISTS lembretes_diarios_status_execucao_idx
      ON lembretes_diarios (status, proxima_execucao_em);
  `,
  `
    CREATE INDEX IF NOT EXISTS lembretes_diarios_usuario_idx
      ON lembretes_diarios (usuario_id, proxima_execucao_em);
  `,
  `
    CREATE INDEX IF NOT EXISTS lembretes_diarios_ativos_idx
      ON lembretes_diarios (deletado_em, proxima_execucao_em);
  `
];

let ensurePromise: Promise<void> | null = null;

function montarDataHoraProxima(dataInicial: string, horaAviso?: string | null) {
  const hora = trimOrUndefined(horaAviso) ?? "09:00";
  return new Date(`${dataInicial}T${hora}:00`);
}

export async function ensureLembretesDiariosEstrutura() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const sql of sqlEstrutura) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}

export class LembreteDiarioRepository {
  private async ensureEstrutura() {
    await ensureLembretesDiariosEstrutura();
  }

  async listar(usuarioId?: number) {
    await this.ensureEstrutura();
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
      ${filtroUsuario}
      ORDER BY proxima_execucao_em ASC, id DESC
    `);
  }

  async obterResumo(usuarioId?: number) {
    await this.ensureEstrutura();
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
      ${filtroUsuario}
    `);

    const row = rows[0];
    return {
      totalPendentes: Number(row?.total_pendentes ?? 0),
      totalVencidos: Number(row?.total_vencidos ?? 0)
    };
  }

  async buscarPorId(id: bigint) {
    await this.ensureEstrutura();
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
        AND deletado_em IS NULL
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Lembrete não encontrado.", 404);
    }
    return registro;
  }

  async criar(input: LembreteDiarioInput) {
    const recorrencia = "DIARIO";
    const proximaExecucao = montarDataHoraProxima(input.dataInicial, input.horaAviso);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO lembretes_diarios (
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
      throw new AppError("Não foi possível criar o lembrete.", 500);
    }
    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: LembreteDiarioInput) {
    await this.buscarPorIdOuFalhar(id);
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
    `);

    return this.buscarPorIdOuFalhar(id);
  }

  async concluir(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        status = 'CONCLUIDO',
        concluido_em = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarPorIdOuFalhar(id);
  }

  async adiar(id: bigint, input: LembreteDiarioAdiarInput) {
    await this.buscarPorIdOuFalhar(id);
    const novaData = new Date(input.novaDataHora);
    if (Number.isNaN(novaData.getTime())) {
      throw new AppError("Nova data para adiar inválida.", 400);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        adiado_ate = ${novaData},
        proxima_execucao_em = ${novaData},
        status = 'PENDENTE',
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarPorIdOuFalhar(id);
  }

  async excluir(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE lembretes_diarios
      SET
        deletado_em = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
  }
}
