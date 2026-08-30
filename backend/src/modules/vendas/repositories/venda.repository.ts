import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type { VendaFilters, VendaInput } from "../venda.types.js";
import type { VendaItemRow, VendaRow } from "../venda.mapper.js";

let estruturaPromise: Promise<void> | null = null;

async function ensureVendaEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      await prisma.$executeRawUnsafe("ALTER TABLE IF EXISTS venda_setor ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await prisma.$executeRawUnsafe("ALTER TABLE IF EXISTS venda_setor_item ADD COLUMN IF NOT EXISTS tenant_id UUID");
      await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_tenant_idx ON venda_setor(tenant_id, criado_em DESC)");
      await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_item_tenant_idx ON venda_setor_item(tenant_id, venda_id)");
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS venda_setor_pagamento (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        venda_id BIGINT NOT NULL REFERENCES venda_setor(id) ON DELETE RESTRICT,
        forma_pagamento VARCHAR(40) NOT NULL,
        valor NUMERIC(14,2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADO',
        criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, venda_id, forma_pagamento)
      )`);
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS venda_setor_caixa_movimentacao (
        id BIGSERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        venda_id BIGINT NOT NULL REFERENCES venda_setor(id) ON DELETE RESTRICT,
        pagamento_id BIGINT REFERENCES venda_setor_pagamento(id) ON DELETE RESTRICT,
        tipo VARCHAR(30) NOT NULL DEFAULT 'ENTRADA',
        forma_pagamento VARCHAR(40) NOT NULL,
        valor NUMERIC(14,2) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, venda_id, tipo, forma_pagamento)
      )`);
      await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_pagamento_tenant_idx ON venda_setor_pagamento(tenant_id, venda_id)");
      await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS venda_setor_caixa_tenant_idx ON venda_setor_caixa_movimentacao(tenant_id, criado_em DESC)");

      await prisma.$executeRawUnsafe(`
        UPDATE venda_setor
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE venda_setor.tenant_id IS NULL
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE venda_setor_item AS item
        SET tenant_id = venda.tenant_id
        FROM venda_setor AS venda
        WHERE item.tenant_id IS NULL
          AND item.venda_id = venda.id
          AND venda.tenant_id IS NOT NULL
      `);
    })().catch((error) => {
      estruturaPromise = null;
      throw error;
    });
  }

  await estruturaPromise;
}

function tenantSql(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

export class VendaRepository {
  async listar(filters: VendaFilters, tenantId: string) {
    await ensureVendaEstrutura();

    const where: Prisma.Sql[] = [Prisma.sql`AND ${tenantSql("v", tenantId)}`];
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
      ${Prisma.join(where, " ")}
      ORDER BY v.id DESC
      LIMIT ${limite}
    `);
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await ensureVendaEstrutura();

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
        AND ${tenantSql("v", tenantId)}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const venda = await this.buscarPorId(id, tenantId);
    if (!venda) {
      throw new AppError("Venda nao encontrada.", 404);
    }
    return venda;
  }

  async listarItensPorVendaId(vendaId: bigint, tenantId: string) {
    await ensureVendaEstrutura();

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
        AND ${tenantSql("vi", tenantId)}
      ORDER BY vi.id ASC
    `);
  }

  async criar(input: VendaInput, tenantId: string) {
    await ensureVendaEstrutura();

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
            AND tenant_id::text = ${tenantId}
          LIMIT 1
        `);

        const encontrado = rows[0];
        if (!encontrado) {
          throw new AppError(`Item ${item.codigo_item} nao encontrado no almoxarifado da instituicao.`, 400);
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
            AND tenant_id::text = ${tenantId}
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO almoxarifado_movimentacao (
            tenant_id,
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
            ${tenantId}::uuid,
            ${encontrado.id},
            CURRENT_DATE,
            'Saida',
            ${item.quantidade},
            ${estoqueAtual - item.quantidade},
            ${'Venda frente de caixa'},
            ${'Frente de caixa'},
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
          tenant_id,
          cliente_nome,
          cliente_documento,
          forma_pagamento,
          valor_total,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
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

      const pagamentoInserido = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO venda_setor_pagamento (tenant_id, venda_id, forma_pagamento, valor, status)
        VALUES (${tenantId}::uuid, ${vendaId}, ${input.forma_pagamento}, ${valorTotal}, 'CONFIRMADO')
        ON CONFLICT (tenant_id, venda_id, forma_pagamento) DO UPDATE SET valor = EXCLUDED.valor
        RETURNING id
      `);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO venda_setor_caixa_movimentacao (tenant_id, venda_id, pagamento_id, tipo, forma_pagamento, valor, descricao)
        VALUES (${tenantId}::uuid, ${vendaId}, ${pagamentoInserido[0]?.id ?? null}, 'ENTRADA', ${input.forma_pagamento}, ${valorTotal}, ${`Recebimento da venda #${vendaId}`})
        ON CONFLICT (tenant_id, venda_id, tipo, forma_pagamento) DO NOTHING
      `);

      for (const item of itensNormalizados) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO venda_setor_item (
            tenant_id,
            venda_id,
            almoxarifado_item_id,
            codigo_item,
            descricao_item,
            quantidade,
            valor_unitario,
            valor_total
          ) VALUES (
            ${tenantId}::uuid,
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
          AND ${tenantSql("v", tenantId)}
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
