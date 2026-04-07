import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import {
  calcularEstoqueDisponivelKit,
  planejarConsumoSaidaKit
} from "../../almoxarifado/almoxarifado-kit.js";
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

type AlmoxarifadoItemEstoqueRow = {
  id: bigint;
  codigo: string;
  descricao: string;
  estoque_atual: number;
  is_kit: boolean;
  estoque_fisico?: number;
  possui_composicao_kit?: boolean;
};

type AlmoxarifadoKitComponenteEstoqueRow = {
  produto_kit_id: bigint;
  produto_item_id: bigint;
  quantidade_item: number;
  estoque_componente: number;
};

type DoacaoRealizadaItemPersistidoRow = {
  almoxarifado_item_id: bigint;
  quantidade: number;
  observacoes: string | null;
};

type UltimaEntregaMesmoItemRow = {
  doacao_realizada_id: bigint;
  data_doacao: Date | string;
  codigo_item: string;
  descricao_item: string;
};

const estruturaDoacaoRealizadaSql = [
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS fora_carencia BOOLEAN NOT NULL DEFAULT FALSE
  `,
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS carencia_dias INTEGER
  `,
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS autorizado_por_usuario_id BIGINT
  `,
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS autorizado_por_nome VARCHAR(120)
  `,
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS autorizacao_carencia_em TIMESTAMP
  `,
  `
    ALTER TABLE doacao_realizada_item
    ADD COLUMN IF NOT EXISTS ultima_entrega_em DATE
  `
];

let estruturaPromise: Promise<void> | null = null;

function toIsoDateInput(value?: Date | string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const texto = String(value).trim();
  if (!texto) {
    return new Date().toISOString().slice(0, 10);
  }

  return texto.slice(0, 10);
}

export function calcularSaldoMovimentacaoDoacao(
  estoqueAtual: number,
  quantidade: number,
  tipo: "Entrada" | "Saida"
) {
  if (tipo === "Entrada") {
    return estoqueAtual + quantidade;
  }

  if (estoqueAtual < quantidade) {
    throw new AppError("Estoque insuficiente para registrar a doacao.", 400);
  }

  return estoqueAtual - quantidade;
}

export class DoacaoRealizadaRepository {
  async listar(filters: DoacaoRealizadaFilters) {
    await this.ensureEstrutura();

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
        )::BIGINT AS total_itens,
        EXISTS (
          SELECT 1
          FROM doacao_realizada_item di
          WHERE di.doacao_realizada_id = d.id
            AND COALESCE(di.fora_carencia, FALSE) = TRUE
        ) AS possui_item_fora_carencia
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = d.vinculo_familiar_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY d.data_doacao DESC, d.id DESC
    `);
  }

  async buscarPorId(id: bigint) {
    await this.ensureEstrutura();

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
        )::BIGINT AS total_itens,
        EXISTS (
          SELECT 1
          FROM doacao_realizada_item di
          WHERE di.doacao_realizada_id = d.id
            AND COALESCE(di.fora_carencia, FALSE) = TRUE
        ) AS possui_item_fora_carencia
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
        di.observacoes,
        COALESCE(di.fora_carencia, FALSE) AS fora_carencia,
        di.carencia_dias,
        di.autorizado_por_nome,
        di.autorizacao_carencia_em,
        di.ultima_entrega_em
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
    await this.ensureEstrutura();

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

      await this.inserirItens(tx, registroId, input.itens, {
        dataMovimentacao: input.data_doacao,
        responsavel: input.responsavel
      });
      return registroId;
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: DoacaoRealizadaInput) {
    await this.ensureEstrutura();
    const atual = await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await this.restaurarEstoqueItens(tx, id, {
        dataMovimentacao: toIsoDateInput(atual.registro.data_doacao),
        responsavel: atual.registro.responsavel ?? input.responsavel ?? undefined
      });

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

      await this.inserirItens(tx, id, input.itens, {
        dataMovimentacao: input.data_doacao,
        responsavel: input.responsavel
      });
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.ensureEstrutura();
    const atual = await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await this.restaurarEstoqueItens(tx, id, {
        dataMovimentacao: toIsoDateInput(atual.registro.data_doacao),
        responsavel: atual.registro.responsavel ?? undefined
      });

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM doacao_realizada
        WHERE id = ${id}
      `);
    });
  }

  async listarBeneficiarios(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const digits = termoSanitizado ? normalizeDigits(termoSanitizado) : undefined;
    const likeCpf = digits ? `%${digits}%` : undefined;
    const filtros: Prisma.Sql[] = [];

    if (like) {
      const filtrosBusca: Prisma.Sql[] = [
        Prisma.sql`b.nome_completo ILIKE ${like}`,
        Prisma.sql`b.codigo ILIKE ${like}`
      ];

      if (likeCpf) {
        filtrosBusca.push(
          Prisma.sql`regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\D', '', 'g') LIKE ${likeCpf}`
        );
      }

      filtros.push(Prisma.sql`(${Prisma.join(filtrosBusca, " OR ")})`);
    }

    const whereClause = filtros.length ? Prisma.sql`WHERE ${Prisma.join(filtros, " AND ")}` : Prisma.empty;

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
      ${whereClause}
      ORDER BY b.nome_completo ASC
      LIMIT 20
    `);
  }

  async listarFamilias(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const whereClause = like ? Prisma.sql`WHERE nome_familia ILIKE ${like}` : Prisma.empty;

    return prisma.$queryRaw<Array<{ id: bigint; nome_familia: string }>>(Prisma.sql`
      SELECT id, nome_familia
      FROM vinculo_familiar
      ${whereClause}
      ORDER BY nome_familia ASC
      LIMIT 20
    `);
  }

  async listarItensEstoque(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const whereClause = like
      ? Prisma.sql`WHERE (codigo ILIKE ${like} OR descricao ILIKE ${like})`
      : Prisma.empty;

    return prisma.$queryRaw<
      Array<{
        id: bigint;
        codigo: string;
        descricao: string;
        unidade: string;
        is_kit: boolean;
        estoque_atual: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        codigo,
        descricao,
        unidade,
        estoque_atual,
        is_kit
      FROM almoxarifado_item
      ${whereClause}
      ORDER BY descricao ASC
      LIMIT 30
    `).then(async (itens) => this.aplicarEstoqueDisponivelKit(itens));
  }

  async buscarUltimaEntregaMesmoItem(payload: {
    beneficiario_id?: number;
    vinculo_familiar_id?: number;
    item_id: number;
    ignorar_doacao_realizada_id?: bigint;
  }) {
    await this.ensureEstrutura();

    const itemId = BigInt(payload.item_id);
    const destinatarioClause = payload.beneficiario_id
      ? Prisma.sql`AND d.beneficiario_id = ${BigInt(payload.beneficiario_id)}`
      : payload.vinculo_familiar_id
        ? Prisma.sql`AND d.vinculo_familiar_id = ${BigInt(payload.vinculo_familiar_id)}`
        : Prisma.sql`AND 1 = 0`;
    const ignorarClause = payload.ignorar_doacao_realizada_id
      ? Prisma.sql`AND d.id <> ${payload.ignorar_doacao_realizada_id}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<UltimaEntregaMesmoItemRow[]>(Prisma.sql`
      SELECT
        d.id AS doacao_realizada_id,
        d.data_doacao,
        ai.codigo AS codigo_item,
        ai.descricao AS descricao_item
      FROM doacao_realizada_item di
      INNER JOIN doacao_realizada d ON d.id = di.doacao_realizada_id
      INNER JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id
      WHERE di.almoxarifado_item_id = ${itemId}
      ${destinatarioClause}
      ${ignorarClause}
      ORDER BY d.data_doacao DESC, d.id DESC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async inserirItens(
    tx: TransactionClient,
    registroId: bigint,
    itens: DoacaoRealizadaItemInput[],
    contexto: {
      dataMovimentacao: string;
      responsavel?: string;
    }
  ) {
    for (const item of itens) {
      const itemId = BigInt(item.item_id);
      await this.buscarItemEstoqueOuFalhar(tx, itemId);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO doacao_realizada_item (
          doacao_realizada_id,
          almoxarifado_item_id,
          quantidade,
          observacoes,
          fora_carencia,
          carencia_dias,
          autorizado_por_usuario_id,
          autorizado_por_nome,
          autorizacao_carencia_em,
          ultima_entrega_em,
          criado_em
        ) VALUES (
          ${registroId},
          ${itemId},
          ${item.quantidade},
          ${trimOrUndefined(item.observacoes)},
          ${Boolean(item.fora_carencia)},
          ${item.carencia_dias_aplicada ?? null},
          ${item.autorizado_por_usuario_id ? BigInt(item.autorizado_por_usuario_id) : null},
          ${trimOrUndefined(item.autorizado_por_nome)},
          ${item.autorizacao_carencia_em ? new Date(item.autorizacao_carencia_em) : null},
          ${toOptionalDate(item.ultima_entrega_em)},
          NOW()
        )
      `);

      await this.movimentarEstoqueDoacao(tx, {
        itemId,
        registroId,
        quantidade: item.quantidade,
        tipo: "Saida",
        dataMovimentacao: contexto.dataMovimentacao,
        responsavel: contexto.responsavel,
        observacoes: item.observacoes
      });
    }
  }

  private async restaurarEstoqueItens(
    tx: TransactionClient,
    registroId: bigint,
    contexto: {
      dataMovimentacao: string;
      responsavel?: string;
    }
  ) {
    const itens = await tx.$queryRaw<DoacaoRealizadaItemPersistidoRow[]>(Prisma.sql`
      SELECT
        almoxarifado_item_id,
        quantidade,
        observacoes
      FROM doacao_realizada_item
      WHERE doacao_realizada_id = ${registroId}
      ORDER BY id ASC
    `);

    for (const item of itens) {
      await this.movimentarEstoqueDoacao(tx, {
        itemId: item.almoxarifado_item_id,
        registroId,
        quantidade: item.quantidade,
        tipo: "Entrada",
        dataMovimentacao: contexto.dataMovimentacao,
        responsavel: contexto.responsavel,
        observacoes: item.observacoes ?? undefined
      });
    }
  }

  private async buscarItemEstoqueOuFalhar(tx: TransactionClient, itemId: bigint) {
    const itens = await tx.$queryRaw<AlmoxarifadoItemEstoqueRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        descricao,
        estoque_atual::float8 AS estoque_atual,
        is_kit
      FROM almoxarifado_item
      WHERE id = ${itemId}
      LIMIT 1
    `);

    const item = itens[0];
    if (!item) {
      throw new AppError("Item de almoxarifado nao encontrado para doacao.", 400);
    }

    return (await this.aplicarEstoqueDisponivelKit([item], tx))[0];
  }

  private async movimentarEstoqueDoacao(
    tx: TransactionClient,
    payload: {
      itemId: bigint;
      registroId: bigint;
      quantidade: number;
      tipo: "Entrada" | "Saida";
      dataMovimentacao: string;
      responsavel?: string;
      observacoes?: string;
    }
  ) {
    const item = await this.buscarItemEstoqueOuFalhar(tx, payload.itemId);
    const estoqueAtual = Number(item.estoque_atual ?? 0);
    const estoqueFisico = Number(item.estoque_fisico ?? item.estoque_atual ?? 0);
    const composicaoKit =
      item.is_kit && item.possui_composicao_kit
        ? await this.listarComposicaoKitComEstoque([payload.itemId], tx)
        : [];

    let saldoApos: number;
    let estoqueFisicoApos = estoqueFisico;
    let quantidadeConsumirComponentes = 0;

    try {
      if (item.is_kit && composicaoKit.length) {
        if (payload.tipo === "Saida") {
          const planoConsumo = planejarConsumoSaidaKit(
            estoqueFisico,
            payload.quantidade,
            composicaoKit
          );
          if (!planoConsumo.suficiente) {
            throw new AppError("Estoque insuficiente para registrar a doacao.", 400);
          }
          estoqueFisicoApos = estoqueFisico - planoConsumo.consumirEstoqueFisico;
          quantidadeConsumirComponentes = planoConsumo.consumirComponentes;
          saldoApos = planoConsumo.estoqueDisponivel - payload.quantidade;
        } else {
          estoqueFisicoApos = estoqueFisico + payload.quantidade;
          saldoApos = estoqueAtual + payload.quantidade;
        }
      } else {
        saldoApos = calcularSaldoMovimentacaoDoacao(estoqueAtual, payload.quantidade, payload.tipo);
        estoqueFisicoApos = saldoApos;
      }
    } catch (error) {
      if (error instanceof AppError && payload.tipo === "Saida") {
        throw new AppError(`Estoque insuficiente para registrar a doacao do item ${item.codigo}.`, 400);
      }
      throw error;
    }
    const referencia =
      payload.tipo === "Saida"
        ? `Doacao realizada ${payload.registroId}`
        : `Estorno da doacao realizada ${payload.registroId}`;
    const observacoes =
      trimOrUndefined(payload.observacoes) ??
      (payload.tipo === "Saida"
        ? `Baixa automatica da doacao realizada para o item ${item.codigo}.`
        : `Estorno automatico da doacao realizada para o item ${item.codigo}.`);

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
        ${payload.itemId},
        ${toOptionalDate(payload.dataMovimentacao)},
        ${payload.tipo},
        ${payload.quantidade},
        ${saldoApos},
        ${referencia},
        ${trimOrUndefined(payload.responsavel)},
        ${observacoes},
        NOW()
      )
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE almoxarifado_item
      SET
        estoque_atual = ${estoqueFisicoApos},
        atualizado_em = NOW()
      WHERE id = ${payload.itemId}
    `);

    if (quantidadeConsumirComponentes > 0) {
      await this.consumirComponentesKit(tx, {
        item,
        quantidadeKits: quantidadeConsumirComponentes,
        dataMovimentacao: payload.dataMovimentacao,
        responsavel: payload.responsavel,
        registroId: payload.registroId,
        observacoes: payload.observacoes,
        composicao: composicaoKit
      });
    }
  }

  private async listarComposicaoKitComEstoque(
    produtoKitIds: bigint[],
    tx: TransactionClient = prisma
  ) {
    if (!produtoKitIds.length) {
      return [] as AlmoxarifadoKitComponenteEstoqueRow[];
    }

    return tx.$queryRaw<AlmoxarifadoKitComponenteEstoqueRow[]>(Prisma.sql`
      SELECT
        c.produto_kit_id,
        c.produto_item_id,
        c.quantidade_item::float8 AS quantidade_item,
        COALESCE(i.estoque_atual, 0)::float8 AS estoque_componente
      FROM produtos_kit_composicao c
      INNER JOIN almoxarifado_item i ON i.id = c.produto_item_id
      WHERE c.ativo = TRUE
        AND c.produto_kit_id IN (${Prisma.join(produtoKitIds)})
    `);
  }

  private async aplicarEstoqueDisponivelKit<
    T extends {
      id: bigint;
      estoque_atual: number;
      is_kit: boolean;
    }
  >(itens: T[], tx: TransactionClient = prisma) {
    const idsKit = itens.filter((item) => item.is_kit).map((item) => item.id);
    if (!idsKit.length) {
      return itens.map((item) => ({
        ...item,
        estoque_fisico: item.estoque_atual,
        possui_composicao_kit: false
      }));
    }

    const composicoes = await this.listarComposicaoKitComEstoque(idsKit, tx);
    const composicaoPorKit = new Map<string, AlmoxarifadoKitComponenteEstoqueRow[]>();

    for (const componente of composicoes) {
      const chave = String(componente.produto_kit_id);
      const lista = composicaoPorKit.get(chave) ?? [];
      lista.push(componente);
      composicaoPorKit.set(chave, lista);
    }

    return itens.map((item) => {
      const estoqueFisico = Number(item.estoque_atual ?? 0);
      const componentes = composicaoPorKit.get(String(item.id)) ?? [];

      if (!item.is_kit || !componentes.length) {
        return {
          ...item,
          estoque_fisico: estoqueFisico,
          possui_composicao_kit: false
        };
      }

      return {
        ...item,
        estoque_fisico: estoqueFisico,
        estoque_atual: calcularEstoqueDisponivelKit(estoqueFisico, componentes),
        possui_composicao_kit: true
      };
    });
  }

  private async consumirComponentesKit(
    tx: TransactionClient,
    payload: {
      item: AlmoxarifadoItemEstoqueRow;
      quantidadeKits: number;
      dataMovimentacao: string;
      responsavel?: string;
      registroId: bigint;
      observacoes?: string;
      composicao: AlmoxarifadoKitComponenteEstoqueRow[];
    }
  ) {
    for (const componente of payload.composicao) {
      const itemComponente = await this.buscarItemEstoqueOuFalhar(tx, componente.produto_item_id);
      const quantidadeConsumida = Number(componente.quantidade_item) * Number(payload.quantidadeKits);
      const saldoApos = Number(itemComponente.estoque_fisico ?? itemComponente.estoque_atual ?? 0) - quantidadeConsumida;

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
          ${componente.produto_item_id},
          ${toOptionalDate(payload.dataMovimentacao)},
          ${"Saida"},
          ${quantidadeConsumida},
          ${saldoApos},
          ${`Doacao realizada ${payload.registroId} via kit ${payload.item.codigo}`},
          ${trimOrUndefined(payload.responsavel)},
          ${trimOrUndefined(payload.observacoes) ?? `Baixa automatica de componente do kit ${payload.item.descricao}.`},
          NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE almoxarifado_item
        SET
          estoque_atual = ${saldoApos},
          atualizado_em = NOW()
        WHERE id = ${componente.produto_item_id}
      `);
    }
  }

  private async ensureEstrutura() {
    await ensureDoacoesRealizadasEstrutura();
  }
}

export async function ensureDoacoesRealizadasEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = Promise.all(
      estruturaDoacaoRealizadaSql.map((sql) =>
        prisma.$executeRawUnsafe(sql).then(() => undefined)
      )
    ).then(() => undefined);
  }

  await estruturaPromise;
}
