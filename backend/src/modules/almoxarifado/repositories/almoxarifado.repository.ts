import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import {
  calcularEstoqueDisponivelKit,
  calcularEstoqueMontavelKit,
  planejarConsumoSaidaKit
} from "../almoxarifado-kit.js";
import type {
  AlmoxarifadoItemInput,
  AlmoxarifadoItemRow,
  AlmoxarifadoKitComposicaoInput,
  AlmoxarifadoKitComposicaoRow,
  AlmoxarifadoMovimentacaoInput,
  AlmoxarifadoMovimentacaoRow
} from "../almoxarifado.types.js";

type TransactionClient = Prisma.TransactionClient;

type AlmoxarifadoKitComponenteEstoqueRow = {
  produto_kit_id: bigint;
  produto_item_id: bigint;
  quantidade_item: number;
  estoque_componente: number;
};

function tenantSql(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

function normalizarTipoMovimentacao(tipo: string) {
  const texto = tipo.trim().toLowerCase();
  if (texto === "entrada") return "Entrada";
  if (texto === "saida" || texto === "saÃ­da") return "Saida";
  if (texto === "ajuste") return "Ajuste";
  return tipo;
}

function calcularSaldo(
  estoqueAtual: number,
  tipo: string,
  quantidade: number,
  direcaoAjuste?: string | null
) {
  if (tipo === "Entrada") return estoqueAtual + quantidade;
  if (tipo === "Saida") {
    if (estoqueAtual < quantidade) {
      throw new AppError("Estoque insuficiente para saÃ­da.", 400);
    }
    return estoqueAtual - quantidade;
  }

  const direcao = (direcaoAjuste ?? "").trim().toLowerCase();
  if (direcao === "decrease" || direcao === "reduzir") {
    if (estoqueAtual < quantidade) {
      throw new AppError("Estoque insuficiente para ajuste de reduÃ§Ã£o.", 400);
    }
    return estoqueAtual - quantidade;
  }
  return estoqueAtual + quantidade;
}

export class AlmoxarifadoRepository {
  async listarItens(tenantId: string) {
    const itens = await prisma.$queryRaw<AlmoxarifadoItemRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        codigo_barras,
        descricao,
        categoria,
        unidade,
        localizacao,
        localizacao_interna,
        estoque_atual,
        estoque_minimo,
        valor_unitario::float8 AS valor_unitario,
        is_kit,
        situacao,
        validade,
        COALESCE(ignorar_validade, FALSE) AS ignorar_validade,
        observacoes
      FROM almoxarifado_item
      WHERE tenant_id::text = ${tenantId}
      ORDER BY descricao ASC, codigo ASC
    `);
    return this.aplicarEstoqueDisponivelKit(itens, tenantId);
  }

  async buscarItemPorId(id: bigint, tenantId: string, tx: TransactionClient = prisma) {
    const rows = await tx.$queryRaw<AlmoxarifadoItemRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        codigo_barras,
        descricao,
        categoria,
        unidade,
        localizacao,
        localizacao_interna,
        estoque_atual,
        estoque_minimo,
        valor_unitario::float8 AS valor_unitario,
        is_kit,
        situacao,
        validade,
        COALESCE(ignorar_validade, FALSE) AS ignorar_validade,
        observacoes
      FROM almoxarifado_item
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarItemPorCodigo(codigo: string, tenantId: string, tx: TransactionClient = prisma) {
    const rows = await tx.$queryRaw<AlmoxarifadoItemRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        codigo_barras,
        descricao,
        categoria,
        unidade,
        localizacao,
        localizacao_interna,
        estoque_atual,
        estoque_minimo,
        valor_unitario::float8 AS valor_unitario,
        is_kit,
        situacao,
        validade,
        COALESCE(ignorar_validade, FALSE) AS ignorar_validade,
        observacoes
      FROM almoxarifado_item
      WHERE codigo = ${codigo}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarItemPorIdOuFalhar(id: bigint, tenantId: string, tx: TransactionClient = prisma) {
    const item = await this.buscarItemPorId(id, tenantId, tx);
    if (!item) throw new AppError("Item de almoxarifado nÃ£o encontrado.", 404);
    return item;
  }

  async buscarItemPorCodigoOuFalhar(codigo: string, tenantId: string, tx: TransactionClient = prisma) {
    const item = await this.buscarItemPorCodigo(codigo, tenantId, tx);
    if (!item) throw new AppError("Item de almoxarifado nÃ£o encontrado.", 404);
    return item;
  }

  async obterProximoCodigo(tenantId: string, tx: TransactionClient = prisma) {
    const rows = await tx.$queryRaw<Array<{ proximo: number }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM almoxarifado_item
      WHERE codigo ~ '^[0-9]+$'
        AND tenant_id::text = ${tenantId}
    `);
    const proximo = rows[0]?.proximo ?? 1;
    return String(proximo).padStart(4, "0");
  }

  async criarItem(input: AlmoxarifadoItemInput, tenantId: string) {
    const codigo = trimOrUndefined(input.codigo) ?? (await this.obterProximoCodigo(tenantId));
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO almoxarifado_item (
        tenant_id,
        codigo,
        codigo_barras,
        descricao,
        categoria,
        unidade,
        localizacao,
        localizacao_interna,
        estoque_atual,
        estoque_minimo,
        valor_unitario,
        is_kit,
        situacao,
        validade,
        ignorar_validade,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${codigo},
        ${trimOrUndefined(input.codigo_barras ?? undefined)},
        ${input.descricao},
        ${input.categoria},
        ${input.unidade},
        ${trimOrUndefined(input.localizacao ?? undefined)},
        ${trimOrUndefined(input.localizacao_interna ?? undefined)},
        ${input.estoque_atual ?? 0},
        ${input.estoque_minimo ?? 0},
        ${input.valor_unitario ?? 0},
        ${!!input.is_kit},
        ${input.situacao},
        ${toOptionalDate(input.validade ?? undefined)},
        ${!!input.ignorar_validade},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
    const id = inserted[0]?.id;
    if (!id) throw new AppError("NÃ£o foi possÃ­vel criar o item.", 500);
    return this.buscarItemPorIdOuFalhar(id, tenantId);
  }

  async atualizarItem(id: bigint, input: AlmoxarifadoItemInput, tenantId: string) {
    await this.buscarItemPorIdOuFalhar(id, tenantId);
    const codigo = trimOrUndefined(input.codigo);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE almoxarifado_item
      SET
        codigo = COALESCE(${codigo}, codigo),
        codigo_barras = ${trimOrUndefined(input.codigo_barras ?? undefined)},
        descricao = ${input.descricao},
        categoria = ${input.categoria},
        unidade = ${input.unidade},
        localizacao = ${trimOrUndefined(input.localizacao ?? undefined)},
        localizacao_interna = ${trimOrUndefined(input.localizacao_interna ?? undefined)},
        estoque_atual = ${input.estoque_atual ?? 0},
        estoque_minimo = ${input.estoque_minimo ?? 0},
        valor_unitario = ${input.valor_unitario ?? 0},
        is_kit = ${!!input.is_kit},
        situacao = ${input.situacao},
        validade = ${toOptionalDate(input.validade ?? undefined)},
        ignorar_validade = ${!!input.ignorar_validade},
        observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarItemPorIdOuFalhar(id, tenantId);
  }

  async removerItem(id: bigint, tenantId: string) {
    await this.buscarItemPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM almoxarifado_item
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarMovimentacoes(tenantId: string) {
    return prisma.$queryRaw<AlmoxarifadoMovimentacaoRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.item_id,
        m.data_movimentacao,
        m.tipo,
        m.quantidade,
        m.saldo_apos,
        m.referencia,
        m.responsavel,
        m.observacoes,
        m.direcao_ajuste,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item
      FROM almoxarifado_movimentacao m
      INNER JOIN almoxarifado_item i ON i.id = m.item_id
      WHERE m.tenant_id::text = ${tenantId}
        AND i.tenant_id::text = ${tenantId}
      ORDER BY m.data_movimentacao DESC, m.id DESC
    `);
  }

  async buscarMovimentacaoPorId(id: bigint, tenantId: string, tx: TransactionClient = prisma) {
    const rows = await tx.$queryRaw<AlmoxarifadoMovimentacaoRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.item_id,
        m.data_movimentacao,
        m.tipo,
        m.quantidade,
        m.saldo_apos,
        m.referencia,
        m.responsavel,
        m.observacoes,
        m.direcao_ajuste,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item
      FROM almoxarifado_movimentacao m
      INNER JOIN almoxarifado_item i ON i.id = m.item_id
      WHERE m.id = ${id}
        AND m.tenant_id::text = ${tenantId}
        AND i.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async registrarMovimentacao(input: AlmoxarifadoMovimentacaoInput, tenantId: string) {
    return prisma.$transaction(async (tx) => {
      const item = await this.buscarItemPorCodigoOuFalhar(input.codigo_item, tenantId, tx);
      const composicaoKit = item.is_kit
        ? await this.listarComposicaoKitComEstoque([item.id], tenantId, tx)
        : [];
      const tipo = normalizarTipoMovimentacao(input.tipo);
      const quantidade = Number(input.quantidade);
      const estoqueFisico = Number(item.estoque_atual ?? 0);
      const estoqueDisponivel = item.is_kit
        ? calcularEstoqueDisponivelKit(estoqueFisico, composicaoKit)
        : estoqueFisico;
      const ajusteReducao =
        tipo === "Ajuste" &&
        ["decrease", "reduzir"].includes((input.direcao_ajuste ?? "").trim().toLowerCase());
      const consomeKit = item.is_kit && composicaoKit.length && (tipo === "Saida" || ajusteReducao);
      const adicionaKit = item.is_kit && composicaoKit.length && !consomeKit;

      let saldoApos: number;
      let estoqueFisicoApos = estoqueFisico;
      let quantidadeConsumirComponentes = 0;

      if (consomeKit) {
        const planoConsumo = planejarConsumoSaidaKit(estoqueFisico, quantidade, composicaoKit);
        if (!planoConsumo.suficiente) {
          throw new AppError("Estoque insuficiente para saÃ­da.", 400);
        }
        estoqueFisicoApos = estoqueFisico - planoConsumo.consumirEstoqueFisico;
        quantidadeConsumirComponentes = planoConsumo.consumirComponentes;
        saldoApos = planoConsumo.estoqueDisponivel - quantidade;
      } else if (adicionaKit) {
        estoqueFisicoApos = calcularSaldo(estoqueFisico, tipo, quantidade, input.direcao_ajuste);
        saldoApos = estoqueDisponivel + (estoqueFisicoApos - estoqueFisico);
      } else {
        saldoApos = calcularSaldo(
          estoqueFisico,
          tipo,
          quantidade,
          input.direcao_ajuste
        );
        estoqueFisicoApos = saldoApos;
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
          direcao_ajuste,
          criado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${item.id},
          ${toOptionalDate(input.data_movimentacao)},
          ${tipo},
          ${quantidade},
          ${saldoApos},
          ${trimOrUndefined(input.referencia ?? undefined)},
          ${trimOrUndefined(input.responsavel ?? undefined)},
          ${trimOrUndefined(input.observacoes ?? undefined)},
          ${trimOrUndefined(input.direcao_ajuste ?? undefined)},
          NOW()
        )
        RETURNING id
      `);

      const movimentacaoId = inserted[0]?.id;
      if (!movimentacaoId) {
        throw new AppError("NÃ£o foi possÃ­vel registrar a movimentaÃ§Ã£o.", 500);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE almoxarifado_item
        SET
          estoque_atual = ${estoqueFisicoApos},
          atualizado_em = NOW()
        WHERE id = ${item.id}
          AND tenant_id::text = ${tenantId}
      `);

      if (item.is_kit && composicaoKit.length && quantidadeConsumirComponentes > 0) {
        await this.consumirComponentesKit(tx, {
          itemKit: item,
          quantidadeKits: quantidadeConsumirComponentes,
          composicao: composicaoKit,
          dataMovimentacao: input.data_movimentacao,
          responsavel: input.responsavel ?? undefined,
          tenantId
        });
      }

      if (input.gerar_itens_kit && item.is_kit && !composicaoKit.length) {
        const composicao = await this.listarComposicaoKit(item.id, tenantId, tx);
        for (const componente of composicao) {
          const componenteAtual = await this.buscarItemPorIdOuFalhar(componente.produto_item_id, tenantId, tx);
          const quantidadeComponente = Number(componente.quantidade_item) * quantidade;
          const tipoGerado = tipo === "Entrada" ? "Saida" : tipo;
          const saldoGerado = calcularSaldo(
            Number(componenteAtual.estoque_atual ?? 0),
            tipoGerado,
            quantidadeComponente,
            null
          );

          const gerada = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
              direcao_ajuste,
              criado_em
            ) VALUES (
              ${tenantId}::uuid,
              ${componente.produto_item_id},
              ${toOptionalDate(input.data_movimentacao)},
              ${tipoGerado},
              ${quantidadeComponente},
              ${saldoGerado},
              ${`MovimentaÃ§Ã£o de kit ${item.codigo}`},
              ${trimOrUndefined(input.responsavel ?? undefined)},
              ${`Gerado automaticamente a partir do kit ${item.descricao}`},
              NULL,
              NOW()
            )
            RETURNING id
          `);

          const geradaId = gerada[0]?.id;
          if (geradaId) {
            await tx.$executeRaw(Prisma.sql`
              INSERT INTO movimentacao_vinculo_kit (
                movimentacao_principal_id,
                movimentacao_gerada_id,
                criado_em
              ) VALUES (
                ${movimentacaoId},
                ${geradaId},
                NOW()
              )
              ON CONFLICT (movimentacao_principal_id, movimentacao_gerada_id)
              DO NOTHING
            `);
          }

          await tx.$executeRaw(Prisma.sql`
            UPDATE almoxarifado_item
            SET
              estoque_atual = ${saldoGerado},
              atualizado_em = NOW()
            WHERE id = ${componente.produto_item_id}
              AND tenant_id::text = ${tenantId}
          `);
        }
      }

      const movimento = await this.buscarMovimentacaoPorId(movimentacaoId, tenantId, tx);
      const itemAtualizado = (await this.aplicarEstoqueDisponivelKit(
        [await this.buscarItemPorIdOuFalhar(item.id, tenantId, tx)],
        tenantId,
        tx
      ))[0];
      if (!movimento) {
        throw new AppError("MovimentaÃ§Ã£o nÃ£o encontrada apÃ³s registro.", 500);
      }

      return { movimentacao: movimento, item: itemAtualizado };
    });
  }

  async listarComposicaoKit(produtoKitId: bigint, tenantId: string, tx: TransactionClient = prisma) {
    await this.buscarItemPorIdOuFalhar(produtoKitId, tenantId, tx);

    return tx.$queryRaw<AlmoxarifadoKitComposicaoRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.produto_kit_id,
        c.produto_item_id,
        c.quantidade_item::float8 AS quantidade_item,
        i.codigo AS produto_item_codigo,
        i.descricao AS produto_item_descricao
      FROM produtos_kit_composicao c
      INNER JOIN almoxarifado_item i ON i.id = c.produto_item_id
      INNER JOIN almoxarifado_item k ON k.id = c.produto_kit_id
      WHERE c.produto_kit_id = ${produtoKitId}
        AND c.ativo = TRUE
        AND ${tenantSql("i", tenantId)}
        AND ${tenantSql("k", tenantId)}
      ORDER BY i.descricao ASC
    `);
  }

  async atualizarComposicaoKit(produtoKitId: bigint, itens: AlmoxarifadoKitComposicaoInput[], tenantId: string) {
    await this.buscarItemPorIdOuFalhar(produtoKitId, tenantId);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE produtos_kit_composicao
        SET ativo = FALSE, atualizado_em = NOW()
        WHERE produto_kit_id = ${produtoKitId}
      `);

      for (const item of itens) {
        await this.buscarItemPorIdOuFalhar(BigInt(item.produto_item_id), tenantId, tx);
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO produtos_kit_composicao (
            produto_kit_id,
            produto_item_id,
            quantidade_item,
            ativo,
            criado_em,
            atualizado_em
          ) VALUES (
            ${produtoKitId},
            ${BigInt(item.produto_item_id)},
            ${item.quantidade_item},
            TRUE,
            NOW(),
            NOW()
          )
          ON CONFLICT (produto_kit_id, produto_item_id)
          DO UPDATE SET
            quantidade_item = EXCLUDED.quantidade_item,
            ativo = TRUE,
            atualizado_em = NOW()
        `);
      }
    });

    return this.listarComposicaoKit(produtoKitId, tenantId);
  }

  async listarVinculosKit(movimentacaoId: bigint, tenantId: string) {
    return prisma.$queryRaw<AlmoxarifadoMovimentacaoRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.item_id,
        m.data_movimentacao,
        m.tipo,
        m.quantidade,
        m.saldo_apos,
        m.referencia,
        m.responsavel,
        m.observacoes,
        m.direcao_ajuste,
        i.codigo AS codigo_item,
        i.descricao AS descricao_item
      FROM movimentacao_vinculo_kit vk
      INNER JOIN almoxarifado_movimentacao principal ON principal.id = vk.movimentacao_principal_id
      INNER JOIN almoxarifado_movimentacao m ON m.id = vk.movimentacao_gerada_id
      INNER JOIN almoxarifado_item i ON i.id = m.item_id
      WHERE vk.movimentacao_principal_id = ${movimentacaoId}
        AND principal.tenant_id::text = ${tenantId}
        AND m.tenant_id::text = ${tenantId}
        AND i.tenant_id::text = ${tenantId}
      ORDER BY m.id ASC
    `);
  }

  private async listarComposicaoKitComEstoque(
    produtoKitIds: bigint[],
    tenantId: string,
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
      INNER JOIN almoxarifado_item k ON k.id = c.produto_kit_id
      WHERE c.ativo = TRUE
        AND c.produto_kit_id IN (${Prisma.join(produtoKitIds)})
        AND ${tenantSql("i", tenantId)}
        AND ${tenantSql("k", tenantId)}
    `);
  }

  private async aplicarEstoqueDisponivelKit(
    itens: AlmoxarifadoItemRow[],
    tenantId: string,
    tx: TransactionClient = prisma
  ) {
    const idsKit = itens.filter((item) => item.is_kit).map((item) => item.id);
    if (!idsKit.length) {
      return itens.map((item) => ({
        ...item,
        estoque_fisico: item.estoque_atual,
        estoque_disponivel: item.estoque_atual,
        possui_composicao_kit: false
      }));
    }

    const composicoes = await this.listarComposicaoKitComEstoque(idsKit, tenantId, tx);
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
          estoque_disponivel: estoqueFisico,
          possui_composicao_kit: false
        };
      }

      const estoqueMontavel = calcularEstoqueMontavelKit(componentes);
      const estoqueDisponivel = calcularEstoqueDisponivelKit(estoqueFisico, componentes);

      return {
        ...item,
        estoque_fisico: estoqueFisico,
        estoque_atual: estoqueDisponivel,
        estoque_disponivel: estoqueDisponivel,
        estoque_montavel_kit: estoqueMontavel,
        possui_composicao_kit: true
      };
    });
  }

  private async consumirComponentesKit(
    tx: TransactionClient,
    payload: {
      itemKit: AlmoxarifadoItemRow;
      quantidadeKits: number;
      composicao: AlmoxarifadoKitComponenteEstoqueRow[];
      dataMovimentacao: string;
      responsavel?: string;
      tenantId: string;
    }
  ) {
    const consumoComponentes = payload.composicao.map((componente) => ({
      ...componente,
      quantidadeConsumida: Number(componente.quantidade_item) * Number(payload.quantidadeKits)
    }));

    for (const componente of consumoComponentes) {
      const componenteAtual = await this.buscarItemPorIdOuFalhar(
        componente.produto_item_id,
        payload.tenantId,
        tx
      );
      const saldoGerado = calcularSaldo(
        Number(componenteAtual.estoque_atual ?? 0),
        "Saida",
        componente.quantidadeConsumida,
        null
      );

      await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
          direcao_ajuste,
          criado_em
        ) VALUES (
          ${payload.tenantId}::uuid,
          ${componente.produto_item_id},
          ${toOptionalDate(payload.dataMovimentacao)},
          ${"Saida"},
          ${componente.quantidadeConsumida},
          ${saldoGerado},
          ${`Consumo automatico do kit ${payload.itemKit.codigo}`},
          ${trimOrUndefined(payload.responsavel ?? undefined)},
          ${`Baixa automatica do componente para o kit ${payload.itemKit.descricao}`},
          NULL,
          NOW()
        )
        RETURNING id
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE almoxarifado_item
        SET
          estoque_atual = ${saldoGerado},
          atualizado_em = NOW()
        WHERE id = ${componente.produto_item_id}
          AND tenant_id::text = ${payload.tenantId}
      `);
    }
  }
}
