import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
export class AutorizacaoComprasRepository {
    async listar() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        titulo,
        tipo,
        area,
        responsavel,
        data_prevista,
        valor::float8 AS valor,
        quantidade_itens,
        justificativa,
        centro_custo,
        prioridade,
        status,
        aprovador,
        decisao,
        observacoes_aprovacao,
        data_aprovacao,
        dispensar_cotacao,
        motivo_dispensa,
        vencedor,
        registro_patrimonio,
        registro_almoxarifado,
        numero_reserva,
        numero_termo,
        autorizacao_pagamento_numero,
        autorizacao_pagamento_autor,
        autorizacao_pagamento_data,
        autorizacao_pagamento_observacoes,
        criado_em,
        atualizado_em
      FROM autorizacao_compras
      ORDER BY id DESC
    `);
    }
    async buscarPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        titulo,
        tipo,
        area,
        responsavel,
        data_prevista,
        valor::float8 AS valor,
        quantidade_itens,
        justificativa,
        centro_custo,
        prioridade,
        status,
        aprovador,
        decisao,
        observacoes_aprovacao,
        data_aprovacao,
        dispensar_cotacao,
        motivo_dispensa,
        vencedor,
        registro_patrimonio,
        registro_almoxarifado,
        numero_reserva,
        numero_termo,
        autorizacao_pagamento_numero,
        autorizacao_pagamento_autor,
        autorizacao_pagamento_data,
        autorizacao_pagamento_observacoes,
        criado_em,
        atualizado_em
      FROM autorizacao_compras
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro) {
            throw new AppError("Autorizacao de compra nao encontrada.", 404);
        }
        return registro;
    }
    async criar(input) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO autorizacao_compras (
        titulo,
        tipo,
        area,
        responsavel,
        data_prevista,
        valor,
        quantidade_itens,
        justificativa,
        centro_custo,
        prioridade,
        status,
        aprovador,
        decisao,
        observacoes_aprovacao,
        data_aprovacao,
        dispensar_cotacao,
        motivo_dispensa,
        vencedor,
        registro_patrimonio,
        registro_almoxarifado,
        numero_reserva,
        numero_termo,
        autorizacao_pagamento_numero,
        autorizacao_pagamento_autor,
        autorizacao_pagamento_data,
        autorizacao_pagamento_observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.titulo},
        ${input.tipo},
        ${trimOrUndefined(input.area ?? undefined)},
        ${trimOrUndefined(input.responsavel ?? undefined)},
        ${toOptionalDate(input.dataPrevista ?? undefined)},
        ${input.valor ?? null},
        ${input.quantidadeItens ?? 1},
        ${trimOrUndefined(input.justificativa ?? undefined)},
        ${trimOrUndefined(input.centroCusto ?? undefined)},
        ${trimOrUndefined(input.prioridade ?? undefined) ?? "normal"},
        ${input.status},
        ${trimOrUndefined(input.aprovador ?? undefined)},
        ${trimOrUndefined(input.decisao ?? undefined)},
        ${trimOrUndefined(input.observacoesAprovacao ?? undefined)},
        ${toOptionalDate(input.dataAprovacao ?? undefined)},
        ${!!input.dispensarCotacao},
        ${trimOrUndefined(input.motivoDispensa ?? undefined)},
        ${trimOrUndefined(input.vencedor ?? undefined)},
        ${!!input.registroPatrimonio},
        ${!!input.registroAlmoxarifado},
        ${trimOrUndefined(input.numeroReserva ?? undefined)},
        ${trimOrUndefined(input.numeroTermo ?? undefined)},
        ${trimOrUndefined(input.autorizacaoPagamentoNumero ?? undefined)},
        ${trimOrUndefined(input.autorizacaoPagamentoAutor ?? undefined)},
        ${toOptionalDate(input.autorizacaoPagamentoData ?? undefined)},
        ${trimOrUndefined(input.autorizacaoPagamentoObservacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar autorizacao de compra.", 500);
        return this.buscarPorIdOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE autorizacao_compras
      SET
        titulo = ${input.titulo},
        tipo = ${input.tipo},
        area = ${trimOrUndefined(input.area ?? undefined)},
        responsavel = ${trimOrUndefined(input.responsavel ?? undefined)},
        data_prevista = ${toOptionalDate(input.dataPrevista ?? undefined)},
        valor = ${input.valor ?? null},
        quantidade_itens = ${input.quantidadeItens ?? 1},
        justificativa = ${trimOrUndefined(input.justificativa ?? undefined)},
        centro_custo = ${trimOrUndefined(input.centroCusto ?? undefined)},
        prioridade = ${trimOrUndefined(input.prioridade ?? undefined) ?? "normal"},
        status = ${input.status},
        aprovador = ${trimOrUndefined(input.aprovador ?? undefined)},
        decisao = ${trimOrUndefined(input.decisao ?? undefined)},
        observacoes_aprovacao = ${trimOrUndefined(input.observacoesAprovacao ?? undefined)},
        data_aprovacao = ${toOptionalDate(input.dataAprovacao ?? undefined)},
        dispensar_cotacao = ${!!input.dispensarCotacao},
        motivo_dispensa = ${trimOrUndefined(input.motivoDispensa ?? undefined)},
        vencedor = ${trimOrUndefined(input.vencedor ?? undefined)},
        registro_patrimonio = ${!!input.registroPatrimonio},
        registro_almoxarifado = ${!!input.registroAlmoxarifado},
        numero_reserva = ${trimOrUndefined(input.numeroReserva ?? undefined)},
        numero_termo = ${trimOrUndefined(input.numeroTermo ?? undefined)},
        autorizacao_pagamento_numero = ${trimOrUndefined(input.autorizacaoPagamentoNumero ?? undefined)},
        autorizacao_pagamento_autor = ${trimOrUndefined(input.autorizacaoPagamentoAutor ?? undefined)},
        autorizacao_pagamento_data = ${toOptionalDate(input.autorizacaoPagamentoData ?? undefined)},
        autorizacao_pagamento_observacoes = ${trimOrUndefined(input.autorizacaoPagamentoObservacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM autorizacao_compras
      WHERE id = ${id}
    `);
    }
    async listarCotacoes(autorizacaoId) {
        await this.buscarPorIdOuFalhar(autorizacaoId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        autorizacao_compra_id,
        fornecedor,
        razao_social,
        cnpj,
        valor::float8 AS valor,
        prazo_entrega,
        validade,
        conformidade,
        observacoes,
        orcamento_fisico_nome,
        orcamento_fisico_tipo,
        orcamento_fisico_conteudo,
        criado_em,
        cartao_cnpj_url,
        cartao_cnpj_nome,
        cartao_cnpj_tipo,
        cartao_cnpj_conteudo
      FROM autorizacao_compras_cotacoes
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY id DESC
    `);
    }
    async criarCotacao(autorizacaoId, input) {
        await this.buscarPorIdOuFalhar(autorizacaoId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO autorizacao_compras_cotacoes (
        autorizacao_compra_id,
        fornecedor,
        razao_social,
        cnpj,
        valor,
        prazo_entrega,
        validade,
        conformidade,
        observacoes,
        orcamento_fisico_nome,
        orcamento_fisico_tipo,
        orcamento_fisico_conteudo,
        criado_em,
        cartao_cnpj_url,
        cartao_cnpj_nome,
        cartao_cnpj_tipo,
        cartao_cnpj_conteudo
      ) VALUES (
        ${autorizacaoId},
        ${input.fornecedor},
        ${trimOrUndefined(input.razaoSocial ?? undefined)},
        ${trimOrUndefined(input.cnpj ?? undefined)},
        ${input.valor},
        ${toOptionalDate(input.prazoEntrega ?? undefined)},
        ${toOptionalDate(input.validade ?? undefined)},
        ${trimOrUndefined(input.conformidade ?? undefined)},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        ${trimOrUndefined(input.orcamentoFisicoNome ?? undefined)},
        ${trimOrUndefined(input.orcamentoFisicoTipo ?? undefined)},
        ${trimOrUndefined(input.orcamentoFisicoConteudo ?? undefined)},
        NOW(),
        ${trimOrUndefined(input.cartaoCnpjUrl ?? undefined)},
        ${trimOrUndefined(input.cartaoCnpjNome ?? undefined)},
        ${trimOrUndefined(input.cartaoCnpjTipo ?? undefined)},
        ${trimOrUndefined(input.cartaoCnpjConteudo ?? undefined)}
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel salvar cotacao.", 500);
        const cotacoes = await this.listarCotacoes(autorizacaoId);
        const cotacao = cotacoes.find((item) => item.id === id);
        if (!cotacao)
            throw new AppError("Cotacao nao encontrada apos inclusao.", 500);
        return cotacao;
    }
    async removerCotacao(autorizacaoId, cotacaoId) {
        await this.buscarPorIdOuFalhar(autorizacaoId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM autorizacao_compras_cotacoes
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND id = ${cotacaoId}
    `);
    }
    async buscarFornecedorPorCnpj(cnpj) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT cnpj, razao_social
      FROM autorizacao_compras_cotacoes
      WHERE cnpj = ${cnpj}
      ORDER BY id DESC
      LIMIT 1
    `);
        return rows[0];
    }
    async registrarReservaBancaria(autorizacaoId, input) {
        await this.buscarPorIdOuFalhar(autorizacaoId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO autorizacao_compras_reserva_bancaria (
        autorizacao_compra_id,
        conta_bancaria_id,
        valor,
        criado_em
      ) VALUES (
        ${autorizacaoId},
        ${BigInt(input.contaBancariaId)},
        ${input.valor},
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel registrar reserva bancaria.", 500);
        const reservas = await this.listarReservas(autorizacaoId);
        const reserva = reservas.find((item) => item.id === id);
        if (!reserva)
            throw new AppError("Reserva bancaria nao encontrada apos inclusao.", 500);
        return reserva;
    }
    async removerReservaBancaria(autorizacaoId, contaId) {
        await this.buscarPorIdOuFalhar(autorizacaoId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM autorizacao_compras_reserva_bancaria
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND conta_bancaria_id = ${contaId}
    `);
    }
    async listarReservas(autorizacaoId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        autorizacao_compra_id,
        conta_bancaria_id,
        valor::float8 AS valor,
        criado_em
      FROM autorizacao_compras_reserva_bancaria
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY id DESC
    `);
    }
    async gerarAutorizacaoPagamento(autorizacaoId, input) {
        const registro = await this.buscarPorIdOuFalhar(autorizacaoId);
        const numero = registro.autorizacao_pagamento_numero ?? `AP-${autorizacaoId.toString().padStart(6, "0")}`;
        await prisma.$executeRaw(Prisma.sql `
      UPDATE autorizacao_compras
      SET
        autorizacao_pagamento_numero = ${numero},
        autorizacao_pagamento_autor = ${trimOrUndefined(input.autor ?? undefined)},
        autorizacao_pagamento_data = ${toOptionalDate(input.data ?? undefined)},
        autorizacao_pagamento_observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${autorizacaoId}
    `);
        return this.buscarPorIdOuFalhar(autorizacaoId);
    }
}
