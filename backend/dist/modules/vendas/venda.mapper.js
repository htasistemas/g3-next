export function mapVendaToResponse(venda, itens) {
    return {
        id: Number(venda.id),
        clienteNome: venda.cliente_nome ?? "",
        clienteDocumento: venda.cliente_documento ?? "",
        formaPagamento: venda.forma_pagamento,
        valorTotal: Number(venda.valor_total ?? 0),
        observacoes: venda.observacoes ?? "",
        criadoEm: venda.criado_em.toISOString(),
        atualizadoEm: venda.atualizado_em.toISOString(),
        itens: itens.map((item) => ({
            id: Number(item.id),
            almoxarifadoItemId: Number(item.almoxarifado_item_id),
            codigoItem: item.codigo_item,
            descricaoItem: item.descricao_item,
            quantidade: Number(item.quantidade ?? 0),
            valorUnitario: Number(item.valor_unitario ?? 0),
            valorTotal: Number(item.valor_total ?? 0)
        }))
    };
}
