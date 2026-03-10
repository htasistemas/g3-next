import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function normalizarTipoMovimentacao(tipo) {
    const texto = tipo.trim().toLowerCase();
    if (texto === "entrada")
        return "Entrada";
    if (texto === "saida" || texto === "saída")
        return "Saida";
    if (texto === "ajuste")
        return "Ajuste";
    return tipo;
}
function calcularSaldo(estoqueAtual, tipo, quantidade, direcaoAjuste) {
    if (tipo === "Entrada")
        return estoqueAtual + quantidade;
    if (tipo === "Saida") {
        if (estoqueAtual < quantidade) {
            throw new AppError("Estoque insuficiente para saída.", 400);
        }
        return estoqueAtual - quantidade;
    }
    const direcao = (direcaoAjuste ?? "").trim().toLowerCase();
    if (direcao === "decrease" || direcao === "reduzir") {
        if (estoqueAtual < quantidade) {
            throw new AppError("Estoque insuficiente para ajuste de redução.", 400);
        }
        return estoqueAtual - quantidade;
    }
    return estoqueAtual + quantidade;
}
export class AlmoxarifadoRepository {
    async listarItens() {
        return prisma.$queryRaw(Prisma.sql `
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
      ORDER BY descricao ASC, codigo ASC
    `);
    }
    async buscarItemPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarItemPorCodigo(codigo) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarItemPorIdOuFalhar(id) {
        const item = await this.buscarItemPorId(id);
        if (!item)
            throw new AppError("Item de almoxarifado não encontrado.", 404);
        return item;
    }
    async buscarItemPorCodigoOuFalhar(codigo) {
        const item = await this.buscarItemPorCodigo(codigo);
        if (!item)
            throw new AppError("Item de almoxarifado não encontrado.", 404);
        return item;
    }
    async obterProximoCodigo() {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM almoxarifado_item
      WHERE codigo ~ '^[0-9]+$'
    `);
        const proximo = rows[0]?.proximo ?? 1;
        return String(proximo).padStart(4, "0");
    }
    async criarItem(input) {
        const codigo = trimOrUndefined(input.codigo) ?? (await this.obterProximoCodigo());
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO almoxarifado_item (
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
        if (!id)
            throw new AppError("Não foi possível criar o item.", 500);
        return this.buscarItemPorIdOuFalhar(id);
    }
    async atualizarItem(id, input) {
        await this.buscarItemPorIdOuFalhar(id);
        const codigo = trimOrUndefined(input.codigo);
        await prisma.$executeRaw(Prisma.sql `
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
    `);
        return this.buscarItemPorIdOuFalhar(id);
    }
    async removerItem(id) {
        await this.buscarItemPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM almoxarifado_item
      WHERE id = ${id}
    `);
    }
    async listarMovimentacoes() {
        return prisma.$queryRaw(Prisma.sql `
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
      ORDER BY m.data_movimentacao DESC, m.id DESC
    `);
    }
    async buscarMovimentacaoPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async registrarMovimentacao(input) {
        return prisma.$transaction(async (tx) => {
            const item = await this.buscarItemPorCodigoOuFalhar(input.codigo_item);
            const tipo = normalizarTipoMovimentacao(input.tipo);
            const quantidade = Number(input.quantidade);
            const saldoApos = calcularSaldo(item.estoque_atual, tipo, quantidade, input.direcao_ajuste);
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO almoxarifado_movimentacao (
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
                throw new AppError("Não foi possível registrar a movimentação.", 500);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE almoxarifado_item
        SET
          estoque_atual = ${saldoApos},
          atualizado_em = NOW()
        WHERE id = ${item.id}
      `);
            if (input.gerar_itens_kit && item.is_kit) {
                const composicao = await this.listarComposicaoKit(item.id);
                for (const componente of composicao) {
                    const componenteAtual = await this.buscarItemPorIdOuFalhar(componente.produto_item_id);
                    const quantidadeComponente = Number(componente.quantidade_item) * quantidade;
                    const tipoGerado = tipo === "Entrada" ? "Saida" : tipo;
                    const saldoGerado = calcularSaldo(componenteAtual.estoque_atual, tipoGerado, quantidadeComponente, null);
                    const gerada = await tx.$queryRaw(Prisma.sql `
            INSERT INTO almoxarifado_movimentacao (
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
              ${componente.produto_item_id},
              ${toOptionalDate(input.data_movimentacao)},
              ${tipoGerado},
              ${quantidadeComponente},
              ${saldoGerado},
              ${`Movimentação de kit ${item.codigo}`},
              ${trimOrUndefined(input.responsavel ?? undefined)},
              ${`Gerado automaticamente a partir do kit ${item.descricao}`},
              NULL,
              NOW()
            )
            RETURNING id
          `);
                    const geradaId = gerada[0]?.id;
                    if (geradaId) {
                        await tx.$executeRaw(Prisma.sql `
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
                    await tx.$executeRaw(Prisma.sql `
            UPDATE almoxarifado_item
            SET
              estoque_atual = ${saldoGerado},
              atualizado_em = NOW()
            WHERE id = ${componente.produto_item_id}
          `);
                }
            }
            const movimento = await this.buscarMovimentacaoPorId(movimentacaoId);
            const itemAtualizado = await this.buscarItemPorIdOuFalhar(item.id);
            if (!movimento) {
                throw new AppError("Movimentação não encontrada após registro.", 500);
            }
            return { movimentacao: movimento, item: itemAtualizado };
        });
    }
    async listarComposicaoKit(produtoKitId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        c.id,
        c.produto_kit_id,
        c.produto_item_id,
        c.quantidade_item::float8 AS quantidade_item,
        i.codigo AS produto_item_codigo,
        i.descricao AS produto_item_descricao
      FROM produtos_kit_composicao c
      INNER JOIN almoxarifado_item i ON i.id = c.produto_item_id
      WHERE c.produto_kit_id = ${produtoKitId}
        AND c.ativo = TRUE
      ORDER BY i.descricao ASC
    `);
    }
    async atualizarComposicaoKit(produtoKitId, itens) {
        await this.buscarItemPorIdOuFalhar(produtoKitId);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE produtos_kit_composicao
        SET ativo = FALSE, atualizado_em = NOW()
        WHERE produto_kit_id = ${produtoKitId}
      `);
            for (const item of itens) {
                await this.buscarItemPorIdOuFalhar(BigInt(item.produto_item_id));
                await tx.$executeRaw(Prisma.sql `
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
        return this.listarComposicaoKit(produtoKitId);
    }
    async listarVinculosKit(movimentacaoId) {
        return prisma.$queryRaw(Prisma.sql `
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
      INNER JOIN almoxarifado_movimentacao m ON m.id = vk.movimentacao_gerada_id
      INNER JOIN almoxarifado_item i ON i.id = m.item_id
      WHERE vk.movimentacao_principal_id = ${movimentacaoId}
      ORDER BY m.id ASC
    `);
    }
}
