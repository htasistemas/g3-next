import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  PatrimonioInput,
  PatrimonioMovimentoInput,
  PatrimonioMovimentoRow,
  PatrimonioRow
} from "../patrimonio.types.js";

type TransactionClient = Prisma.TransactionClient;

const estruturaSql = [
  "ALTER TABLE patrimonio_item ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS patrimonio_movimentacao ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS patrimonio_item_tenant_idx ON patrimonio_item(tenant_id, nome, id DESC)",
  "CREATE INDEX IF NOT EXISTS patrimonio_item_numero_tenant_idx ON patrimonio_item(tenant_id, numero_patrimonio)",
  "CREATE INDEX IF NOT EXISTS patrimonio_movimentacao_tenant_idx ON patrimonio_movimentacao(tenant_id, patrimonio_id, data_movimento DESC)",
  `
    UPDATE patrimonio_item AS p
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE p.tenant_id IS NULL
  `,
  `
    UPDATE patrimonio_movimentacao AS m
    SET tenant_id = p.tenant_id
    FROM patrimonio_item p
    WHERE m.tenant_id IS NULL
      AND p.id = m.patrimonio_id
      AND p.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class PatrimonioRepository {
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

  async listar(tenantId: string) {
    await this.garantirEstrutura();
    const patrimonios = await prisma.$queryRaw<PatrimonioRow[]>(Prisma.sql`
      SELECT
        id,
        numero_patrimonio,
        nome,
        categoria,
        subcategoria,
        conservacao,
        status,
        data_aquisicao,
        valor_aquisicao::float8 AS valor_aquisicao,
        origem,
        responsavel,
        unidade,
        sala,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        observacoes,
        criado_em,
        atualizado_em
      FROM patrimonio_item
      WHERE tenant_id::text = ${tenantId}
      ORDER BY nome ASC, id DESC
    `);

    const movimentos = await prisma.$queryRaw<PatrimonioMovimentoRow[]>(Prisma.sql`
      SELECT
        id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento
      FROM patrimonio_movimentacao
      WHERE tenant_id::text = ${tenantId}
      ORDER BY data_movimento DESC, id DESC
    `);

    return patrimonios.map((patrimonio) => ({
      patrimonio,
      movimentos: movimentos.filter((movimento) => movimento.patrimonio_id === patrimonio.id)
    }));
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<PatrimonioRow[]>(Prisma.sql`
      SELECT
        id,
        numero_patrimonio,
        nome,
        categoria,
        subcategoria,
        conservacao,
        status,
        data_aquisicao,
        valor_aquisicao::float8 AS valor_aquisicao,
        origem,
        responsavel,
        unidade,
        sala,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        observacoes,
        criado_em,
        atualizado_em
      FROM patrimonio_item
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const patrimonio = rows[0];
    if (!patrimonio) return null;

    const movimentos = await prisma.$queryRaw<PatrimonioMovimentoRow[]>(Prisma.sql`
      SELECT
        id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento
      FROM patrimonio_movimentacao
      WHERE patrimonio_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY data_movimento DESC, id DESC
    `);

    return { patrimonio, movimentos };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Patrimonio nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: PatrimonioInput, tenantId: string) {
    await this.garantirEstrutura();
    const id = await prisma.$transaction(async (tx) => {
      await this.validarNumeroUnico(tx, input.numeroPatrimonio, tenantId);
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO patrimonio_item (
          tenant_id,
          numero_patrimonio,
          nome,
          categoria,
          subcategoria,
          conservacao,
          status,
          data_aquisicao,
          valor_aquisicao,
          origem,
          responsavel,
          unidade,
          sala,
          taxa_depreciacao,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${input.numeroPatrimonio},
          ${input.nome},
          ${trimOrUndefined(input.categoria)},
          ${trimOrUndefined(input.subcategoria)},
          ${trimOrUndefined(input.conservacao)},
          ${trimOrUndefined(input.status)},
          ${toOptionalDate(input.dataAquisicao)},
          ${input.valorAquisicao ?? null},
          ${trimOrUndefined(input.origem)},
          ${trimOrUndefined(input.responsavel)},
          ${trimOrUndefined(input.unidade)},
          ${trimOrUndefined(input.sala)},
          ${input.taxaDepreciacao ?? null},
          ${trimOrUndefined(input.observacoes)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const patrimonioId = inserted[0]?.id;
      if (!patrimonioId) {
        throw new AppError("Nao foi possivel criar o patrimonio.", 500);
      }

      return patrimonioId;
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: PatrimonioInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      await this.validarNumeroUnico(tx, input.numeroPatrimonio, tenantId, id);
      await tx.$executeRaw(Prisma.sql`
        UPDATE patrimonio_item
        SET
          numero_patrimonio = ${input.numeroPatrimonio},
          nome = ${input.nome},
          categoria = ${trimOrUndefined(input.categoria)},
          subcategoria = ${trimOrUndefined(input.subcategoria)},
          conservacao = ${trimOrUndefined(input.conservacao)},
          status = ${trimOrUndefined(input.status)},
          data_aquisicao = ${toOptionalDate(input.dataAquisicao)},
          valor_aquisicao = ${input.valorAquisicao ?? null},
          origem = ${trimOrUndefined(input.origem)},
          responsavel = ${trimOrUndefined(input.responsavel)},
          unidade = ${trimOrUndefined(input.unidade)},
          sala = ${trimOrUndefined(input.sala)},
          taxa_depreciacao = ${input.taxaDepreciacao ?? null},
          observacoes = ${trimOrUndefined(input.observacoes)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async registrarMovimento(id: bigint, input: PatrimonioMovimentoInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO patrimonio_movimentacao (
        tenant_id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${id},
        ${input.tipo},
        ${trimOrUndefined(input.destino)},
        ${trimOrUndefined(input.responsavel)},
        ${trimOrUndefined(input.observacao)},
        ${toOptionalDate(input.dataMovimento) ?? new Date()},
        NOW()
      )
    `);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE patrimonio_item
      SET
        status = CASE
          WHEN ${input.tipo} = 'BAIXA' THEN 'Baixado'
          ELSE status
        END,
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  private async validarNumeroUnico(
    tx: TransactionClient,
    numeroPatrimonio: string,
    tenantId: string,
    idAtual?: bigint
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM patrimonio_item
      WHERE numero_patrimonio = ${numeroPatrimonio}
        AND tenant_id::text = ${tenantId}
      ${idAtual ? Prisma.sql`AND id <> ${idAtual}` : Prisma.empty}
      LIMIT 1
    `);

    if (rows.length) {
      throw new AppError("Ja existe patrimonio com este numero.", 409);
    }
  }
}
