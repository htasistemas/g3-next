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

export class PatrimonioRepository {
  async listar() {
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
      ORDER BY data_movimento DESC, id DESC
    `);

    return patrimonios.map((patrimonio) => ({
      patrimonio,
      movimentos: movimentos.filter((movimento) => movimento.patrimonio_id === patrimonio.id)
    }));
  }

  async buscarPorId(id: bigint) {
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
      ORDER BY data_movimento DESC, id DESC
    `);

    return { patrimonio, movimentos };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Patrimônio não encontrado.", 404);
    }
    return registro;
  }

  async criar(input: PatrimonioInput) {
    const id = await prisma.$transaction(async (tx) => {
      await this.validarNumeroUnico(tx, input.numeroPatrimonio);
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO patrimonio_item (
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
        throw new AppError("Não foi possível criar o patrimônio.", 500);
      }

      return patrimonioId;
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: PatrimonioInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await this.validarNumeroUnico(tx, input.numeroPatrimonio, id);
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
      `);
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async registrarMovimento(id: bigint, input: PatrimonioMovimentoInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO patrimonio_movimentacao (
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento,
        criado_em
      ) VALUES (
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
    `);

    return this.buscarPorIdOuFalhar(id);
  }

  private async validarNumeroUnico(
    tx: TransactionClient,
    numeroPatrimonio: string,
    idAtual?: bigint
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM patrimonio_item
      WHERE numero_patrimonio = ${numeroPatrimonio}
      ${idAtual ? Prisma.sql`AND id <> ${idAtual}` : Prisma.empty}
      LIMIT 1
    `);

    if (rows.length) {
      throw new AppError("Já existe patrimônio com este número.", 409);
    }
  }
}
