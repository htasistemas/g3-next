import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DoadorInput,
  RegistroDoacaoFilters,
  RegistroDoacaoInput,
  RegistroDoacaoItemInput
} from "../registro-doacao.types.js";
import type {
  DoadorRow,
  RegistroDoacaoItemRow,
  RegistroDoacaoRow
} from "../registro-doacao.mapper.js";

type TransactionClient = Prisma.TransactionClient;
let estruturaPromise: Promise<void> | null = null;

function toOptionalNumber(value?: number | null): number | null {
  if (value === null || value === undefined) return null;
  return Number.isFinite(value) ? value : null;
}

function normalizarTextoLivre(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizarTextoBusca(value?: string | null) {
  return normalizarTextoLivre(value).toLocaleLowerCase("pt-BR");
}

function statusPermiteIntegracaoAlmoxarifado(status?: string | null) {
  const statusNormalizado = normalizarTextoBusca(status);
  if (!statusNormalizado) return false;
  return !["aguardando", "cancelado", "cancelada"].includes(statusNormalizado);
}

function tipoDoacaoIntegraAlmoxarifado(tipoDoacao?: string | null) {
  const tipoNormalizado = normalizarTextoBusca(tipoDoacao);
  return tipoNormalizado === "doação de bens de consumo" || tipoNormalizado === "doacao de bens de consumo";
}

async function ensureRegistroDoacaoEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = prisma
      .$executeRawUnsafe(`
        ALTER TABLE recebimento_doacao
          ADD COLUMN IF NOT EXISTS numero_recibo VARCHAR(80)
      `)
      .then(() => undefined);
  }

  await estruturaPromise;
}

export class RegistroDoacaoRepository {
  async listar(filters: RegistroDoacaoFilters) {
    await ensureRegistroDoacaoEstrutura();
    const where: Prisma.Sql[] = [];

    const doadorNome = trimOrUndefined(filters.doador_nome);
    if (doadorNome) {
      where.push(Prisma.sql`AND d.nome ILIKE ${`%${doadorNome}%`}`);
    }

    const tipoDoacao = trimOrUndefined(filters.tipo_doacao);
    if (tipoDoacao) {
      where.push(Prisma.sql`AND r.tipo_doacao ILIKE ${`%${tipoDoacao}%`}`);
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND r.status ILIKE ${`%${status}%`}`);
    }

    const dataInicial = toOptionalDate(filters.data_inicial);
    if (dataInicial) {
      where.push(Prisma.sql`AND r.data_recebimento >= ${dataInicial}`);
    }

    const dataFinal = toOptionalDate(filters.data_final);
    if (dataFinal) {
      where.push(Prisma.sql`AND r.data_recebimento <= ${dataFinal}`);
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    return prisma.$queryRaw<RegistroDoacaoRow[]>(Prisma.sql`
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.numero_recibo,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY r.data_recebimento DESC, r.id DESC
    `);
  }

  async buscarPorId(id: bigint) {
    await ensureRegistroDoacaoEstrutura();
    const registros = await prisma.$queryRaw<RegistroDoacaoRow[]>(Prisma.sql`
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.numero_recibo,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id
      WHERE r.id = ${id}
      LIMIT 1
    `);

    const registro = registros[0];
    if (!registro) return null;

    const itens = await prisma.$queryRaw<RegistroDoacaoItemRow[]>(Prisma.sql`
      SELECT
        id,
        recebimento_doacao_id,
        descricao,
        quantidade,
        unidade,
        valor_unitario,
        valor_total,
        marca,
        modelo,
        conservacao,
        observacoes
      FROM recebimento_doacao_item
      WHERE recebimento_doacao_id = ${id}
      ORDER BY id ASC
    `);

    return { registro, itens };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const item = await this.buscarPorId(id);
    if (!item) {
      throw new AppError("Registro de doacao nao encontrado.", 404);
    }
    return item;
  }

  async criar(input: RegistroDoacaoInput) {
    await ensureRegistroDoacaoEstrutura();
    const registroId = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO recebimento_doacao (
          doador_id,
          numero_recibo,
          tipo_doacao,
          descricao,
          quantidade_itens,
          valor_medio,
          valor_total,
          valor,
          data_recebimento,
          forma_recebimento,
          recorrente,
          periodicidade,
          proxima_cobranca,
          status,
          observacoes,
          conta_recebimento_id,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.doador_id ? BigInt(input.doador_id) : null},
          ${trimOrUndefined(input.numero_recibo)},
          ${input.tipo_doacao},
          ${trimOrUndefined(input.descricao)},
          ${input.quantidade_itens ?? null},
          ${toOptionalNumber(input.valor_medio)},
          ${toOptionalNumber(input.valor_total)},
          ${toOptionalNumber(input.valor)},
          ${toOptionalDate(input.data_recebimento)},
          ${trimOrUndefined(input.forma_recebimento)},
          ${!!input.recorrente},
          ${trimOrUndefined(input.periodicidade)},
          ${toOptionalDate(input.proxima_cobranca)},
          ${input.status},
          ${trimOrUndefined(input.observacoes)},
          ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const registroId = inserted[0]?.id;
      if (!registroId) {
        throw new AppError("Nao foi possivel criar o registro de doacao.", 500);
      }

      await this.inserirItens(tx, registroId, input.itens ?? []);
      await this.integrarAoAlmoxarifadoSeAplicavel(tx, registroId, input);
      return registroId;
    });

    return this.buscarPorIdOuFalhar(registroId);
  }

  async atualizar(id: bigint, input: RegistroDoacaoInput) {
    await ensureRegistroDoacaoEstrutura();
    await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE recebimento_doacao
        SET
          doador_id = ${input.doador_id ? BigInt(input.doador_id) : null},
          numero_recibo = ${trimOrUndefined(input.numero_recibo)},
          tipo_doacao = ${input.tipo_doacao},
          descricao = ${trimOrUndefined(input.descricao)},
          quantidade_itens = ${input.quantidade_itens ?? null},
          valor_medio = ${toOptionalNumber(input.valor_medio)},
          valor_total = ${toOptionalNumber(input.valor_total)},
          valor = ${toOptionalNumber(input.valor)},
          data_recebimento = ${toOptionalDate(input.data_recebimento)},
          forma_recebimento = ${trimOrUndefined(input.forma_recebimento)},
          recorrente = ${!!input.recorrente},
          periodicidade = ${trimOrUndefined(input.periodicidade)},
          proxima_cobranca = ${toOptionalDate(input.proxima_cobranca)},
          status = ${input.status},
          observacoes = ${trimOrUndefined(input.observacoes)},
          conta_recebimento_id = ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM recebimento_doacao_item
        WHERE recebimento_doacao_id = ${id}
      `);

      await this.inserirItens(tx, id, input.itens ?? []);
      await this.integrarAoAlmoxarifadoSeAplicavel(tx, id, input);
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM recebimento_doacao
      WHERE id = ${id}
    `);
  }

  async listarDoadores(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const filtroBusca = like
      ? Prisma.sql`
        AND (
          nome ILIKE ${like}
          OR documento ILIKE ${like}
          OR email ILIKE ${like}
        )
      `
      : Prisma.empty;

    return prisma.$queryRaw<DoadorRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE 1 = 1
      ${filtroBusca}
      ORDER BY nome ASC
    `);
  }

  async criarDoador(input: DoadorInput) {
    const inserted = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      INSERT INTO doador (
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.nome},
        ${trimOrUndefined(input.tipo_pessoa)},
        ${normalizeDigits(input.documento) ?? trimOrUndefined(input.documento)},
        ${trimOrUndefined(input.responsavel_empresa)},
        ${trimOrUndefined(input.email)},
        ${normalizeDigits(input.telefone)},
        ${trimOrUndefined(input.logradouro)},
        ${trimOrUndefined(input.numero)},
        ${trimOrUndefined(input.complemento)},
        ${trimOrUndefined(input.bairro)},
        ${trimOrUndefined(input.cidade)},
        ${trimOrUndefined(input.uf)?.toUpperCase()},
        ${normalizeDigits(input.cep)},
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar o doador.", 500);
    }

    const doadores = await prisma.$queryRaw<DoadorRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE id = ${id}
      LIMIT 1
    `);

    const doador = doadores[0];
    if (!doador) {
      throw new AppError("Doador nao encontrado apos criacao.", 500);
    }
    return doador;
  }

  async removerDoador(id: bigint) {
    const existentes = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM doador
      WHERE id = ${id}
      LIMIT 1
    `);
    if (!existentes[0]) {
      throw new AppError("Doador nao encontrado.", 404);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM doador
      WHERE id = ${id}
    `);
  }

  private async inserirItens(
    tx: TransactionClient,
    registroId: bigint,
    itens: RegistroDoacaoItemInput[]
  ) {
    for (const item of itens) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO recebimento_doacao_item (
          recebimento_doacao_id,
          descricao,
          quantidade,
          unidade,
          valor_unitario,
          valor_total,
          marca,
          modelo,
          conservacao,
          observacoes,
          criado_em
        ) VALUES (
          ${registroId},
          ${item.descricao},
          ${item.quantidade},
          ${trimOrUndefined(item.unidade)},
          ${toOptionalNumber(item.valor_unitario)},
          ${toOptionalNumber(item.valor_total)},
          ${trimOrUndefined(item.marca)},
          ${trimOrUndefined(item.modelo)},
          ${trimOrUndefined(item.conservacao)},
          ${trimOrUndefined(item.observacoes)},
          NOW()
        )
      `);
    }
  }

  private async integrarAoAlmoxarifadoSeAplicavel(
    tx: TransactionClient,
    registroId: bigint,
    input: RegistroDoacaoInput
  ) {
    if (!tipoDoacaoIntegraAlmoxarifado(input.tipo_doacao)) {
      return;
    }

    if (!statusPermiteIntegracaoAlmoxarifado(input.status)) {
      return;
    }

    const itens = (input.itens ?? []).filter((item) => item.quantidade > 0);
    if (!itens.length) {
      return;
    }

    const movimentacoesExistentes = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM almoxarifado_movimentacao
      WHERE doacao_id = ${registroId}
      LIMIT 1
    `);

    if (movimentacoesExistentes[0]) {
      return;
    }

    const doadorRows = input.doador_id
      ? await tx.$queryRaw<Array<{ nome: string | null }>>(Prisma.sql`
          SELECT nome
          FROM doador
          WHERE id = ${BigInt(input.doador_id)}
          LIMIT 1
        `)
      : [];

    const responsavel = normalizarTextoLivre(doadorRows[0]?.nome) || "Doador não informado";
    const categoria = "Doação";
    const referencia = `Doação ${registroId.toString()}`;

    for (const item of itens) {
      const descricao = normalizarTextoLivre(item.descricao);
      if (!descricao) continue;

      const unidade = normalizarTextoLivre(item.unidade) || "UN";
      let almoxItem = await this.buscarItemAlmoxarifadoDuplicado(tx, descricao, categoria, unidade);

      if (!almoxItem) {
        almoxItem = await this.criarItemAlmoxarifadoViaDoacao(tx, {
          descricao,
          categoria,
          unidade,
          valor_unitario: item.valor_unitario,
          observacoes: `Item criado automaticamente a partir da doação ${registroId.toString()}.`
        });
      }

      const quantidade = Number(item.quantidade ?? 0);
      const saldoApos = Number(almoxItem.estoque_atual ?? 0) + quantidade;

      await tx.$executeRaw(Prisma.sql`
        UPDATE almoxarifado_item
        SET estoque_atual = ${saldoApos}, atualizado_em = NOW()
        WHERE id = ${almoxItem.id}
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
          doacao_id,
          criado_em
        ) VALUES (
          ${almoxItem.id},
          ${toOptionalDate(input.data_recebimento)},
          ${"Entrada"},
          ${quantidade},
          ${saldoApos},
          ${referencia},
          ${responsavel},
          ${normalizarTextoLivre(input.descricao) || "Entrada gerada automaticamente pelo recebimento de doação."},
          ${registroId},
          NOW()
        )
      `);
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE recebimento_doacao
      SET lancamentos_gerados = TRUE, atualizado_em = NOW()
      WHERE id = ${registroId}
    `);
  }

  private async buscarItemAlmoxarifadoDuplicado(
    tx: TransactionClient,
    descricao: string,
    categoria: string,
    unidade: string
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint; estoque_atual: number }>>(Prisma.sql`
      SELECT id, estoque_atual
      FROM almoxarifado_item
      WHERE LOWER(descricao) = ${normalizarTextoBusca(descricao)}
        AND LOWER(categoria) = ${normalizarTextoBusca(categoria)}
        AND LOWER(unidade) = ${normalizarTextoBusca(unidade)}
      ORDER BY id ASC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async criarItemAlmoxarifadoViaDoacao(
    tx: TransactionClient,
    input: {
      descricao: string;
      categoria: string;
      unidade: string;
      valor_unitario?: number;
      observacoes?: string;
    }
  ) {
    const proximoCodigoRows = await tx.$queryRaw<Array<{ proximo: number }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM almoxarifado_item
      WHERE codigo ~ '^[0-9]+$'
    `);

    const codigo = String(proximoCodigoRows[0]?.proximo ?? 1).padStart(4, "0");
    const inserted = await tx.$queryRaw<Array<{ id: bigint; estoque_atual: number }>>(Prisma.sql`
      INSERT INTO almoxarifado_item (
        codigo,
        descricao,
        categoria,
        unidade,
        estoque_atual,
        estoque_minimo,
        valor_unitario,
        is_kit,
        situacao,
        ignorar_validade,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${codigo},
        ${input.descricao},
        ${input.categoria},
        ${input.unidade},
        0,
        0,
        ${toOptionalNumber(input.valor_unitario) ?? 0},
        FALSE,
        ${"Ativo"},
        TRUE,
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id, estoque_atual
    `);

    const item = inserted[0];
    if (!item) {
      throw new AppError("Nao foi possivel criar o item de almoxarifado para a doacao.", 500);
    }

    return item;
  }
}
