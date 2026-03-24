export type VendaRow = {
  id: bigint;
  cliente_nome: string | null;
  cliente_documento: string | null;
  forma_pagamento: string;
  valor_total: number;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type VendaItemRow = {
  id: bigint;
  venda_id: bigint;
  almoxarifado_item_id: bigint;
  codigo_item: string;
  descricao_item: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export function mapVendaToResponse(venda: VendaRow, itens: VendaItemRow[]) {
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
