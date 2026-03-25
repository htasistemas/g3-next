function toIso(value) {
    return value?.toISOString();
}
export function mapEventoCarteira(row) {
    return {
        id: Number(row.id),
        nomeEvento: row.nome_evento,
        tipoEvento: row.tipo_evento,
        dataInicio: toIso(row.data_inicio),
        dataFim: toIso(row.data_fim),
        status: row.status,
        permiteRecarga: !!row.permite_recarga,
        permiteTransferencia: !!row.permite_transferencia,
        permiteEstorno: !!row.permite_estorno,
        validadeCredito: toIso(row.validade_credito),
        centroReceita: row.centro_receita ?? "",
        modoFinanceiro: row.modo_financeiro,
        observacoes: row.observacoes ?? "",
        permiteSaldoNegativoAdm: !!row.permite_saldo_negativo_adm,
        criadoEm: toIso(row.criado_em),
        atualizadoEm: toIso(row.atualizado_em)
    };
}
export function mapParticipanteCarteira(row) {
    return {
        id: Number(row.id),
        eventoId: Number(row.evento_id),
        nomeEvento: row.nome_evento ?? "",
        nome: row.nome,
        telefone: row.telefone ?? "",
        cpf: row.cpf ?? "",
        fotoUrl: row.foto_url ?? "",
        responsavel: row.responsavel ?? "",
        numeroCarteira: row.numero_carteira,
        status: row.status,
        qrCodeTokenUnico: row.qr_code_token_unico,
        saldoAtual: Number(row.saldo_atual ?? 0),
        observacoes: row.observacoes ?? "",
        criadoEm: toIso(row.criado_em),
        atualizadoEm: toIso(row.atualizado_em)
    };
}
export function mapBarracaEvento(row) {
    return {
        id: Number(row.id),
        eventoId: Number(row.evento_id),
        nomeEvento: row.nome_evento ?? "",
        nomeBarraca: row.nome_barraca,
        responsavel: row.responsavel ?? "",
        tipoBarraca: row.tipo_barraca ?? "",
        operador: row.operador ?? "",
        status: row.status,
        impressora: row.impressora ?? "",
        observacoes: row.observacoes ?? "",
        criadoEm: toIso(row.criado_em),
        atualizadoEm: toIso(row.atualizado_em)
    };
}
export function mapItemEvento(row) {
    return {
        id: Number(row.id),
        eventoId: Number(row.evento_id),
        barracaId: row.barraca_id ? Number(row.barraca_id) : undefined,
        nomeEvento: row.nome_evento ?? "",
        nomeBarraca: row.nome_barraca ?? "",
        nomeItem: row.nome_item,
        categoria: row.categoria,
        preco: Number(row.preco ?? 0),
        estoque: row.estoque == null ? undefined : Number(row.estoque),
        ativo: !!row.ativo,
        fotoUrl: row.foto_url ?? "",
        ordemExibicao: row.ordem_exibicao == null ? 0 : Number(row.ordem_exibicao),
        criadoEm: toIso(row.criado_em),
        atualizadoEm: toIso(row.atualizado_em)
    };
}
export function mapMovimentacaoCarteira(row) {
    return {
        id: Number(row.id),
        eventoId: Number(row.evento_id),
        participanteId: Number(row.participante_id),
        barracaId: row.barraca_id ? Number(row.barraca_id) : undefined,
        itemId: row.item_id ? Number(row.item_id) : undefined,
        vendaId: row.venda_id ? Number(row.venda_id) : undefined,
        tipoMovimentacao: row.tipo_movimentacao,
        formaPagamento: row.forma_pagamento ?? "",
        valor: Number(row.valor ?? 0),
        saldoAnterior: Number(row.saldo_anterior ?? 0),
        saldoPosterior: Number(row.saldo_posterior ?? 0),
        descricao: row.descricao ?? "",
        motivo: row.motivo ?? "",
        referenciaExterna: row.referencia_externa ?? "",
        criadoEm: toIso(row.criado_em),
        operadorNome: row.operador_nome ?? "",
        participanteNome: row.participante_nome ?? "",
        barracaNome: row.barraca_nome ?? "",
        itemNome: row.item_nome ?? ""
    };
}
export function mapVendaCarteira(row, itens) {
    return {
        id: Number(row.id),
        eventoId: Number(row.evento_id),
        barracaId: Number(row.barraca_id),
        participanteId: Number(row.participante_id),
        chaveOperacao: row.chave_operacao,
        valorTotal: Number(row.valor_total ?? 0),
        saldoAntes: Number(row.saldo_antes ?? 0),
        saldoDepois: Number(row.saldo_depois ?? 0),
        observacao: row.observacao ?? "",
        criadoEm: toIso(row.criado_em),
        operadorNome: row.operador_nome ?? "",
        participanteNome: row.participante_nome ?? "",
        barracaNome: row.barraca_nome ?? "",
        itens: itens.map((item) => ({
            id: Number(item.id),
            itemId: Number(item.item_id),
            nomeItem: item.nome_item,
            quantidade: Number(item.quantidade ?? 0),
            valorUnitario: Number(item.valor_unitario ?? 0),
            valorTotal: Number(item.valor_total ?? 0)
        }))
    };
}
