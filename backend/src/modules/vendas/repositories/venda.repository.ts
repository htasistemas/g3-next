import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type { VendaFilters, VendaInput } from "../venda.types.js";
import type { VendaItemRow, VendaRow } from "../venda.mapper.js";

export class VendaRepository {
  async listar(filters: VendaFilters) {
    const where: Prisma.Sql[] = [];
    const clienteNome = trimOrUndefined(filters.cliente_nome);
    if (clienteNome) {
      where.push(Prisma.sql`AND COALESCE(v.cliente_nome, '') ILIKE ${`%${clienteNome}%`}`);
    }

    const formaPagamento = trimOrUndefined(filters.forma_pagamento);
    if (formaPagamento) {
      where.push(Prisma.sql`AND v.forma_pagamento = ${formaPagamento.toUpperCase()}`);
    }

    const dataInicial = toOptionalDate(filters.data_inicial);
    if (dataInicial) {
      where.push(Prisma.sql`AND DATE(v.criado_em) >= ${dataInicial}`);
    }

    const dataFinal = toOptionalDate(filters.data_final);
    if (dataFinal) {
      where.push(Prisma.sql`AND DATE(v.criado_em) <= ${dataFinal}`);
    }

    const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 20;
    const whereClause = where.length ? Prisma.sql`${Prisma.join(where, " ")}` : Prisma.empty;

    return prisma.$queryRaw<VendaRow[]>(Prisma.sql`
      SELECT
        v.id,
        v.cliente_nome,
        v.cliente_documento,
        v.forma_pagamento,
        v.valor_total,
        v.observacoes,
        v.criado_em,
        v.atualizado_em
      FROM venda_setor v
      WHERE 1 = 1
      ${whereClause}
      ORDER BY v.id DESC
      LIMIT ${limite}
    `);
  }

  async buscarPorId(id: bigint) {
    const rows = await prisma.$queryRaw<VendaRow[]>(Prisma.sql`
      SELECT
        v.id,
        v.cliente_nome,
        v.cliente_documento,
        v.forma_pagamento,
        v.valor_total,
        v.observacoes,
        v.criado_em,
        v.atualizado_em
      FROM venda_setor v
      WHERE v.id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const venda = await this.buscarPorId(id);
    if (!venda) {
      throw new AppError("Venda nao encontrada.", 404);
    }
    return venda;
  }

  async listarItensPorVendaId(vendaId: bigint) {
    return prisma.$queryRaw<VendaItemRow[]>(Prisma.sql`
      SELECT
        vi.id,
        vi.venda_id,
        vi.almoxarifado_item_id,
        vi.codigo_item,
        vi.descricao_item,
        vi.quantidade,
        vi.valor_unitario,
        vi.valor_total
      FROM venda_setor_item vi
      WHERE vi.venda_id = ${vendaId}
      ORDER BY vi.id ASC
    `);
  }

  async criar(input: VendaInput) {
    return prisma.$transaction(async (tx) => {
      let valorTotal = 0;
      const itensNormalizados: Array<{
        almoxarifadoItemId: bigint;
        codigoItem: string;
        descricaoItem: string;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
      }> = [];

      for (const item of input.itens) {
        const rows = await tx.$queryRaw<Array<{
          id: bigint;
          codigo: string;
          descricao: string;
          estoque_atual: number;
          valor_unitario: number;
        }>>(Prisma.sql`
          SELECT id, codigo, descricao, estoque_atual, valor_unitario
          FROM almoxarifado_item
          WHERE codigo = ${item.codigo_item}
          LIMIT 1
        `);

        const encontrado = rows[0];
        if (!encontrado) {
          throw new AppError(`Item ${item.codigo_item} nao encontrado no almoxarifado.`, 400);
        }

        const estoqueAtual = Number(encontrado.estoque_atual ?? 0);
        if (estoqueAtual < item.quantidade) {
          throw new AppError(`Estoque insuficiente para ${encontrado.descricao}.`, 400);
        }

        const valorUnitario = Number(item.valor_unitario ?? encontrado.valor_unitario ?? 0);
        const totalItem = valorUnitario * item.quantidade;
        valorTotal += totalItem;

        await tx.$executeRaw(Prisma.sql`
          UPDATE almoxarifado_item
          SET estoque_atual = ${estoqueAtual - item.quantidade}, atualizado_em = NOW()
          WHERE id = ${encontrado.id}
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO almoxarifado_movimentacao (
            item_id,
            data_movimentacao,
            tipo,
            quantidade,
            saldo_apos,
            referencia,
            responsavel,
            observacoes,
            criado_em
          ) VALUES (
            ${encontrado.id},
            CURRENT_DATE,
            'Saida',
            ${item.quantidade},
            ${estoqueAtual - item.quantidade},
            ${'Venda frente de caixa'},
            ${'Setor vendas'},
            ${'Baixa automatica pela frente de caixa'},
            NOW()
          )
        `);

        itensNormalizados.push({
          almoxarifadoItemId: encontrado.id,
          codigoItem: encontrado.codigo,
          descricaoItem: item.descricao_item?.trim() || encontrado.descricao,
          quantidade: item.quantidade,
          valorUnitario,
          valorTotal: totalItem
        });
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO venda_setor (
          cliente_nome,
          cliente_documento,
          forma_pagamento,
          valor_total,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          ${trimOrUndefined(input.cliente_nome)},
          ${trimOrUndefined(input.cliente_documento)},
          ${input.forma_pagamento},
          ${valorTotal},
          ${trimOrUndefined(input.observacoes)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const vendaId = inserted[0]?.id;
      if (!vendaId) {
        throw new AppError("Nao foi possivel concluir a venda.", 500);
      }

      for (const item of itensNormalizados) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO venda_setor_item (
            venda_id,
            almoxarifado_item_id,
            codigo_item,
            descricao_item,
            quantidade,
            valor_unitario,
            valor_total
          ) VALUES (
            ${vendaId},
            ${item.almoxarifadoItemId},
            ${item.codigoItem},
            ${item.descricaoItem},
            ${item.quantidade},
            ${item.valorUnitario},
            ${item.valorTotal}
          )
        `);
      }

      const venda = await tx.$queryRaw<VendaRow[]>(Prisma.sql`
        SELECT
          v.id,
          v.cliente_nome,
          v.cliente_documento,
          v.forma_pagamento,
          v.valor_total,
          v.observacoes,
          v.criado_em,
          v.atualizado_em
        FROM venda_setor v
        WHERE v.id = ${vendaId}
        LIMIT 1
      `);

      const resultado = venda[0];
      if (!resultado) {
        throw new AppError("Venda concluida, mas nao encontrada para retorno.", 500);
      }

      return resultado;
    });
  }
}
