export const metodoPagamentoVendaValues = ["DINHEIRO", "DEBITO", "CREDITO", "PIX"] as const;

export type MetodoPagamentoVenda = (typeof metodoPagamentoVendaValues)[number];

export type VendaItemInput = {
  codigo_item: string;
  descricao_item?: string;
  quantidade: number;
  valor_unitario: number;
};

export type VendaInput = {
  cliente_nome?: string;
  cliente_documento?: string;
  forma_pagamento: MetodoPagamentoVenda;
  observacoes?: string;
  itens: VendaItemInput[];
};

export type VendaFilters = {
  cliente_nome?: string;
  forma_pagamento?: string;
  data_inicial?: string;
  data_final?: string;
  limite?: number;
};
