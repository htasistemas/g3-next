import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
export class ContabilidadeRepository {
    async listarContasBancarias() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        banco,
        agencia,
        numero,
        tipo,
        projeto_vinculado,
        pix_vinculado,
        tipo_chave_pix,
        chave_pix,
        recebimento_local,
        saldo::float8 AS saldo,
        data_atualizacao
      FROM conta_bancaria
      ORDER BY banco ASC, numero ASC
    `);
    }
    async buscarContaBancariaPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        banco,
        agencia,
        numero,
        tipo,
        projeto_vinculado,
        pix_vinculado,
        tipo_chave_pix,
        chave_pix,
        recebimento_local,
        saldo::float8 AS saldo,
        data_atualizacao
      FROM conta_bancaria
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarContaBancariaPorIdOuFalhar(id) {
        const conta = await this.buscarContaBancariaPorId(id);
        if (!conta)
            throw new AppError("Conta bancaria nao encontrada.", 404);
        return conta;
    }
    async criarContaBancaria(input) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO conta_bancaria (
        banco,
        agencia,
        numero,
        tipo,
        projeto_vinculado,
        pix_vinculado,
        tipo_chave_pix,
        chave_pix,
        recebimento_local,
        saldo,
        data_atualizacao,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.banco},
        ${trimOrUndefined(input.agencia ?? undefined)},
        ${input.numero},
        ${input.tipo},
        ${trimOrUndefined(input.projetoVinculado ?? undefined)},
        ${!!input.pixVinculado},
        ${trimOrUndefined(input.tipoChavePix ?? undefined)},
        ${trimOrUndefined(input.chavePix ?? undefined)},
        ${!!input.recebimentoLocal},
        ${input.saldo},
        ${toOptionalDate(input.dataAtualizacao)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar conta bancaria.", 500);
        return this.buscarContaBancariaPorIdOuFalhar(id);
    }
    async atualizarContaBancaria(id, input) {
        await this.buscarContaBancariaPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE conta_bancaria
      SET
        banco = ${input.banco},
        agencia = ${trimOrUndefined(input.agencia ?? undefined)},
        numero = ${input.numero},
        tipo = ${input.tipo},
        projeto_vinculado = ${trimOrUndefined(input.projetoVinculado ?? undefined)},
        pix_vinculado = ${!!input.pixVinculado},
        tipo_chave_pix = ${trimOrUndefined(input.tipoChavePix ?? undefined)},
        chave_pix = ${trimOrUndefined(input.chavePix ?? undefined)},
        recebimento_local = ${!!input.recebimentoLocal},
        saldo = ${input.saldo},
        data_atualizacao = ${toOptionalDate(input.dataAtualizacao)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarContaBancariaPorIdOuFalhar(id);
    }
    async removerContaBancaria(id) {
        await this.buscarContaBancariaPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM conta_bancaria
      WHERE id = ${id}
    `);
    }
    async listarLancamentos() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo,
        descricao,
        contraparte,
        vencimento,
        valor::float8 AS valor,
        situacao,
        compra_id
      FROM lancamento_financeiro
      ORDER BY vencimento DESC, id DESC
    `);
    }
    async buscarLancamentoPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo,
        descricao,
        contraparte,
        vencimento,
        valor::float8 AS valor,
        situacao,
        compra_id
      FROM lancamento_financeiro
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarLancamentoPorIdOuFalhar(id) {
        const lancamento = await this.buscarLancamentoPorId(id);
        if (!lancamento)
            throw new AppError("Lancamento financeiro nao encontrado.", 404);
        return lancamento;
    }
    async criarLancamento(input) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO lancamento_financeiro (
        tipo,
        descricao,
        contraparte,
        vencimento,
        valor,
        situacao,
        compra_id,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.tipo},
        ${input.descricao},
        ${input.contraparte},
        ${toOptionalDate(input.vencimento)},
        ${input.valor},
        ${input.situacao},
        ${input.compraId ? BigInt(input.compraId) : null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar lancamento.", 500);
        return this.buscarLancamentoPorIdOuFalhar(id);
    }
    async atualizarLancamento(id, input) {
        await this.buscarLancamentoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE lancamento_financeiro
      SET
        tipo = ${input.tipo},
        descricao = ${input.descricao},
        contraparte = ${input.contraparte},
        vencimento = ${toOptionalDate(input.vencimento)},
        valor = ${input.valor},
        situacao = ${input.situacao},
        compra_id = ${input.compraId ? BigInt(input.compraId) : null},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarLancamentoPorIdOuFalhar(id);
    }
    async atualizarSituacaoLancamento(id, status) {
        await this.buscarLancamentoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE lancamento_financeiro
      SET
        situacao = ${status},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarLancamentoPorIdOuFalhar(id);
    }
    async removerLancamento(id) {
        await this.buscarLancamentoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM lancamento_financeiro
      WHERE id = ${id}
    `);
    }
    async pagarLancamento(id, dataPagamento) {
        const lancamento = await this.buscarLancamentoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE lancamento_financeiro
      SET
        situacao = 'pago',
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return {
            numeroRecibo: `REC-${String(id).padStart(6, "0")}`,
            dataPagamento: dataPagamento ?? new Date().toISOString().slice(0, 10),
            valorTotal: lancamento.valor,
            compraId: lancamento.compra_id ? Number(lancamento.compra_id) : undefined,
            descricao: lancamento.descricao
        };
    }
    async listarMovimentacoes() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.tipo,
        m.descricao,
        m.contraparte,
        m.categoria,
        m.conta_bancaria_id,
        m.data_movimentacao,
        m.valor::float8 AS valor,
        c.numero AS conta_bancaria_numero,
        c.banco AS conta_bancaria_banco
      FROM movimentacao_financeira m
      LEFT JOIN conta_bancaria c ON c.id = m.conta_bancaria_id
      ORDER BY m.data_movimentacao DESC, m.id DESC
    `);
    }
    async buscarMovimentacaoPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.tipo,
        m.descricao,
        m.contraparte,
        m.categoria,
        m.conta_bancaria_id,
        m.data_movimentacao,
        m.valor::float8 AS valor,
        c.numero AS conta_bancaria_numero,
        c.banco AS conta_bancaria_banco
      FROM movimentacao_financeira m
      LEFT JOIN conta_bancaria c ON c.id = m.conta_bancaria_id
      WHERE m.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarMovimentacaoPorIdOuFalhar(id) {
        const movimentacao = await this.buscarMovimentacaoPorId(id);
        if (!movimentacao)
            throw new AppError("Movimentacao financeira nao encontrada.", 404);
        return movimentacao;
    }
    async criarMovimentacao(input) {
        if (input.contaBancariaId) {
            await this.buscarContaBancariaPorIdOuFalhar(BigInt(input.contaBancariaId));
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO movimentacao_financeira (
        tipo,
        descricao,
        contraparte,
        categoria,
        conta_bancaria_id,
        data_movimentacao,
        valor,
        criado_em
      ) VALUES (
        ${input.tipo},
        ${input.descricao},
        ${trimOrUndefined(input.contraparte ?? undefined)},
        ${trimOrUndefined(input.categoria ?? undefined)},
        ${input.contaBancariaId ? BigInt(input.contaBancariaId) : null},
        ${toOptionalDate(input.dataMovimentacao)},
        ${input.valor},
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar movimentacao.", 500);
        return this.buscarMovimentacaoPorIdOuFalhar(id);
    }
    async atualizarMovimentacao(id, input) {
        await this.buscarMovimentacaoPorIdOuFalhar(id);
        if (input.contaBancariaId) {
            await this.buscarContaBancariaPorIdOuFalhar(BigInt(input.contaBancariaId));
        }
        await prisma.$executeRaw(Prisma.sql `
      UPDATE movimentacao_financeira
      SET
        tipo = ${input.tipo},
        descricao = ${input.descricao},
        contraparte = ${trimOrUndefined(input.contraparte ?? undefined)},
        categoria = ${trimOrUndefined(input.categoria ?? undefined)},
        conta_bancaria_id = ${input.contaBancariaId ? BigInt(input.contaBancariaId) : null},
        data_movimentacao = ${toOptionalDate(input.dataMovimentacao)},
        valor = ${input.valor}
      WHERE id = ${id}
    `);
        return this.buscarMovimentacaoPorIdOuFalhar(id);
    }
    async removerMovimentacao(id) {
        await this.buscarMovimentacaoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM movimentacao_financeira
      WHERE id = ${id}
    `);
    }
    async listarEmendas() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto::float8 AS valor_previsto,
        dias_alerta,
        status,
        observacoes
      FROM emenda_impositiva
      ORDER BY data_prevista DESC, id DESC
    `);
    }
    async buscarEmendaPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto::float8 AS valor_previsto,
        dias_alerta,
        status,
        observacoes
      FROM emenda_impositiva
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarEmendaPorIdOuFalhar(id) {
        const emenda = await this.buscarEmendaPorId(id);
        if (!emenda)
            throw new AppError("Emenda impositiva nao encontrada.", 404);
        return emenda;
    }
    async criarEmenda(input) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO emenda_impositiva (
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto,
        dias_alerta,
        status,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.identificacao},
        ${trimOrUndefined(input.referenciaLegal ?? undefined)},
        ${toOptionalDate(input.dataPrevista)},
        ${input.valorPrevisto},
        ${input.diasAlerta},
        ${input.status},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar emenda.", 500);
        return this.buscarEmendaPorIdOuFalhar(id);
    }
    async atualizarStatusEmenda(id, status) {
        await this.buscarEmendaPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE emenda_impositiva
      SET
        status = ${status},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarEmendaPorIdOuFalhar(id);
    }
}
