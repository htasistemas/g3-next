import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DoacaoRealizadaFilters,
  DoacaoRealizadaInput,
  DoacaoRealizadaItemInput
} from "../doacao-realizada.types.js";
import type {
  DoacaoRealizadaItemRow,
  DoacaoRealizadaRow
} from "../doacao-realizada.mapper.js";

type TransactionClient = Prisma.TransactionClient;

export class DoacaoRealizadaRepository {
  async listar(filters: DoacaoRealizadaFilters) {
    const where: Prisma.Sql[] = [];

    const beneficiarioNome = trimOrUndefined(filters.beneficiario_nome);
    if (beneficiarioNome) {
      where.push(
        Prisma.sql`AND (
          b.nome_completo ILIKE ${`%${beneficiarioNome}%`}
          OR vf.nome_familia ILIKE ${`%${beneficiarioNome}%`}
        )`
      );
    }

    const tipoDoacao = trimOrUndefined(filters.tipo_doacao);
    if (tipoDoacao) {
      where.push(Prisma.sql`AND d.tipo_doacao ILIKE ${`%${tipoDoacao}%`}`);
    }

    const situacao = trimOrUndefined(filters.situacao);
    if (situacao) {
      where.push(Prisma.sql`AND d.situacao ILIKE ${`%${situacao}%`}`);
    }

    const dataInicial = toOptionalDate(filters.data_inicial);
    if (dataInicial) {
      where.push(Prisma.sql`AND d.data_doacao >= ${dataInicial}`);
    }

    const dataFinal = toOptionalDate(filters.data_final);
    if (dataFinal) {
      where.push(Prisma.sql`AND d.data_doacao <= ${dataFinal}`);
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    return prisma.$queryRaw<DoacaoRealizadaRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.beneficiario_id,
        d.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        d.tipo_doacao,
        d.situacao,
        d.responsavel,
        d.observacoes,
        d.data_doacao,
        d.criado_em,
        d.atualizado_em,
        (
          SELECT COUNT(*)
          FROM doacao_realizada_item di
          WHERE di.doacao_realizada_id = d.id
        )::BIGINT AS total_itens
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = d.vinculo_familiar_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY d.data_doacao DESC, d.id DESC
    `);
  }

  async buscarPorId(id: bigint) {
    const registros = await prisma.$queryRaw<DoacaoRealizadaRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.beneficiario_id,
        d.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        d.tipo_doacao,
        d.situacao,
        d.responsavel,
        d.observacoes,
        d.data_doacao,
        d.criado_em,
        d.atualizado_em,
        (
          SELECT COUNT(*)
          FROM doacao_realizada_item di
          WHERE di.doacao_realizada_id = d.id
        )::BIGINT AS total_itens
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = d.vinculo_familiar_id
      WHERE d.id = ${id}
      LIMIT 1
    `);

    const registro = registros[0];
    if (!registro) return null;

    const itens = await prisma.$queryRaw<DoacaoRealizadaItemRow[]>(Prisma.sql`
      SELECT
        di.id,
        di.doacao_realizada_id,
        di.almoxarifado_item_id,
        ai.codigo AS codigo_item,
        ai.descricao AS descricao_item,
        ai.unidade AS unidade_item,
        di.quantidade,
        di.observacoes
      FROM doacao_realizada_item di
      INNER JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id
      WHERE di.doacao_realizada_id = ${id}
      ORDER BY di.id ASC
    `);

    return { registro, itens };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Doacao realizada nao encontrada.", 404);
    }
    return registro;
  }

  async criar(input: DoacaoRealizadaInput) {
    const id = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO doacao_realizada (
          beneficiario_id,
          vinculo_familiar_id,
          tipo_doacao,
          situacao,
          responsavel,
          observacoes,
          data_doacao,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
          ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
          ${input.tipo_doacao},
          ${input.situacao},
          ${trimOrUndefined(input.responsavel)},
          ${trimOrUndefined(input.observacoes)},
          ${toOptionalDate(input.data_doacao)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const registroId = inserted[0]?.id;
      if (!registroId) {
        throw new AppError("Nao foi possivel criar a doacao realizada.", 500);
      }

      await this.inserirItens(tx, registroId, input.itens);
      return registroId;
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: DoacaoRealizadaInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE doacao_realizada
        SET
          beneficiario_id = ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
          vinculo_familiar_id = ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
          tipo_doacao = ${input.tipo_doacao},
          situacao = ${input.situacao},
          responsavel = ${trimOrUndefined(input.responsavel)},
          observacoes = ${trimOrUndefined(input.observacoes)},
          data_doacao = ${toOptionalDate(input.data_doacao)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM doacao_realizada_item
        WHERE doacao_realizada_id = ${id}
      `);

      await this.inserirItens(tx, id, input.itens);
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM doacao_realizada
      WHERE id = ${id}
    `);
  }

  async listarBeneficiarios(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : null;
    const digits = termoSanitizado ? normalizeDigits(termoSanitizado) : undefined;
    const likeCpf = digits ? `%${digits}%` : null;

    return prisma.$queryRaw<
      Array<{ id: bigint; nome_completo: string; codigo: string | null; cpf: string | null }>
    >(Prisma.sql`
      SELECT
        b.id,
        b.nome_completo,
        b.codigo,
        cpf_doc.numero_documento AS cpf
      FROM cadastro_beneficiario b
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND (
            UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
            OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
          )
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf_doc ON TRUE
      WHERE (
        ${like} IS NULL
        OR b.nome_completo ILIKE ${like}
        OR b.codigo ILIKE ${like}
        OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') LIKE COALESCE(${likeCpf}, '%')
      )
      ORDER BY b.nome_completo ASC
      LIMIT 20
    `);
  }

  async listarFamilias(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : null;

    return prisma.$queryRaw<Array<{ id: bigint; nome_familia: string }>>(Prisma.sql`
      SELECT id, nome_familia
      FROM vinculo_familiar
      WHERE (${like} IS NULL OR nome_familia ILIKE ${like})
      ORDER BY nome_familia ASC
      LIMIT 20
    `);
  }

  async listarItensEstoque(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : null;

    return prisma.$queryRaw<
      Array<{
        id: bigint;
        codigo: string;
        descricao: string;
        unidade: string;
        estoque_atual: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        codigo,
        descricao,
        unidade,
        estoque_atual
      FROM almoxarifado_item
      WHERE (
        ${like} IS NULL
        OR codigo ILIKE ${like}
        OR descricao ILIKE ${like}
      )
      ORDER BY descricao ASC
      LIMIT 30
    `);
  }

  private async inserirItens(
    tx: TransactionClient,
    registroId: bigint,
    itens: DoacaoRealizadaItemInput[]
  ) {
    for (const item of itens) {
      const itemExistente = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM almoxarifado_item
        WHERE id = ${BigInt(item.item_id)}
        LIMIT 1
      `);
      if (!itemExistente[0]) {
        throw new AppError("Item de almoxarifado nao encontrado para doacao.", 400);
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO doacao_realizada_item (
          doacao_realizada_id,
          almoxarifado_item_id,
          quantidade,
          observacoes,
          criado_em
        ) VALUES (
          ${registroId},
          ${BigInt(item.item_id)},
          ${item.quantidade},
          ${trimOrUndefined(item.observacoes)},
          NOW()
        )
      `);
    }
  }
}
