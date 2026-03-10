function toIsoDateTime(value) {
    return value ? value.toISOString() : null;
}
export function mapEventoEmprestimoToResponse(row) {
    return {
        id: Number(row.id),
        titulo: row.titulo,
        descricao: row.descricao ?? null,
        local: row.local ?? null,
        dataInicio: row.data_inicio.toISOString(),
        dataFim: row.data_fim.toISOString(),
        status: row.status
    };
}
export function mapEmprestimoItemToResponse(row) {
    return {
        id: Number(row.id),
        itemId: Number(row.item_id),
        tipoItem: row.tipo_item,
        quantidade: row.quantidade,
        statusItem: row.status_item,
        observacaoItem: row.observacao_item ?? null,
        nomeItem: row.nome_item ?? null,
        numeroPatrimonio: row.numero_patrimonio ?? null
    };
}
export function mapEmprestimoToResponse(row, itens) {
    return {
        id: Number(row.id),
        evento: {
            id: Number(row.evento_id),
            titulo: row.evento_titulo,
            descricao: row.evento_descricao ?? null,
            local: row.evento_local ?? null,
            dataInicio: row.evento_data_inicio.toISOString(),
            dataFim: row.evento_data_fim.toISOString(),
            status: row.evento_status
        },
        unidadeId: row.unidade_id ? Number(row.unidade_id) : null,
        responsavel: row.responsavel_id
            ? {
                id: Number(row.responsavel_id),
                nome: row.responsavel_nome ?? ""
            }
            : null,
        dataRetiradaPrevista: row.data_retirada_prevista.toISOString(),
        dataDevolucaoPrevista: row.data_devolucao_prevista.toISOString(),
        dataRetiradaReal: toIsoDateTime(row.data_retirada_real),
        dataDevolucaoReal: toIsoDateTime(row.data_devolucao_real),
        status: row.status,
        observacoes: row.observacoes ?? null,
        itens: itens.map(mapEmprestimoItemToResponse)
    };
}
export function mapMovimentacaoToResponse(row) {
    return {
        id: Number(row.id),
        emprestimoId: Number(row.emprestimo_id),
        acao: row.acao,
        descricao: row.descricao ?? null,
        usuarioId: row.usuario_id ? Number(row.usuario_id) : null,
        criadoEm: row.criado_em.toISOString()
    };
}
