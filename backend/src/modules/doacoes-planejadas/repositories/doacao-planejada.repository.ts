import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DoacaoPlanejadaFilters,
  DoacaoPlanejadaInput
} from "../doacao-planejada.types.js";
import type { DoacaoPlanejadaRow } from "../doacao-planejada.mapper.js";

export class DoacaoPlanejadaRepository {
  async listar(filters: DoacaoPlanejadaFilters) {
    const where: Prisma.Sql[] = [];

    const beneficiarioId = Number(filters.beneficiario_id);
    if (Number.isInteger(beneficiarioId) && beneficiarioId > 0) {
      where.push(Prisma.sql`AND dp.beneficiario_id = ${BigInt(beneficiarioId)}`);
    }

    const vinculoFamiliarId = Number(filters.vinculo_familiar_id);
    if (Number.isInteger(vinculoFamiliarId) && vinculoFamiliarId > 0) {
      where.push(Prisma.sql`AND dp.vinculo_familiar_id = ${BigInt(vinculoFamiliarId)}`);
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND dp.status ILIKE ${`%${status}%`}`);
    }

    const dataInicial = toOptionalDate(filters.data_inicial);
    if (dataInicial) {
      where.push(Prisma.sql`AND dp.data_prevista >= ${dataInicial}`);
    }

    const dataFinal = toOptionalDate(filters.data_final);
    if (dataFinal) {
      where.push(Prisma.sql`AND dp.data_prevista <= ${dataFinal}`);
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    return prisma.$queryRaw<DoacaoPlanejadaRow[]>(Prisma.sql`
      SELECT
        dp.id,
        dp.beneficiario_id,
        dp.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        dp.almoxarifado_item_id,
        ai.codigo AS item_codigo,
        ai.descricao AS item_descricao,
        ai.unidade AS item_unidade,
        dp.quantidade,
        dp.data_prevista,
        dp.prioridade,
        dp.status,
        dp.observacoes,
        dp.motivo_cancelamento,
        dp.criado_em,
        dp.atualizado_em
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      LEFT JOIN cadastro_beneficiario b ON b.id = dp.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = dp.vinculo_familiar_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY dp.data_prevista ASC, dp.id DESC
    `);
  }

  async buscarPorId(id: bigint) {
    const rows = await prisma.$queryRaw<DoacaoPlanejadaRow[]>(Prisma.sql`
      SELECT
        dp.id,
        dp.beneficiario_id,
        dp.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        dp.almoxarifado_item_id,
        ai.codigo AS item_codigo,
        ai.descricao AS item_descricao,
        ai.unidade AS item_unidade,
        dp.quantidade,
        dp.data_prevista,
        dp.prioridade,
        dp.status,
        dp.observacoes,
        dp.motivo_cancelamento,
        dp.criado_em,
        dp.atualizado_em
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      LEFT JOIN cadastro_beneficiario b ON b.id = dp.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = dp.vinculo_familiar_id
      WHERE dp.id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const row = await this.buscarPorId(id);
    if (!row) {
      throw new AppError("Doacao planejada nao encontrada.", 404);
    }
    return row;
  }

  async criar(input: DoacaoPlanejadaInput) {
    const inserted = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      INSERT INTO doacao_planejada (
        beneficiario_id,
        vinculo_familiar_id,
        almoxarifado_item_id,
        quantidade,
        data_prevista,
        prioridade,
        status,
        observacoes,
        motivo_cancelamento,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
        ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
        ${BigInt(input.item_id)},
        ${input.quantidade},
        ${toOptionalDate(input.data_prevista)},
        ${input.prioridade},
        ${input.status},
        ${trimOrUndefined(input.observacoes)},
        ${trimOrUndefined(input.motivo_cancelamento)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar a doacao planejada.", 500);
    }

    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: DoacaoPlanejadaInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE doacao_planejada
      SET
        beneficiario_id = ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
        vinculo_familiar_id = ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
        almoxarifado_item_id = ${BigInt(input.item_id)},
        quantidade = ${input.quantidade},
        data_prevista = ${toOptionalDate(input.data_prevista)},
        prioridade = ${input.prioridade},
        status = ${input.status},
        observacoes = ${trimOrUndefined(input.observacoes)},
        motivo_cancelamento = ${trimOrUndefined(input.motivo_cancelamento)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);

    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM doacao_planejada
      WHERE id = ${id}
    `);
  }
}

