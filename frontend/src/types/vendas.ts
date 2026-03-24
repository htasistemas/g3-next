export type VendaItemPayload = {
  codigo_item: string;
  descricao_item?: string;
  quantidade: number;
  valor_unitario: number;
};

export type VendaPayload = {
  cliente_nome?: string;
  cliente_documento?: string;
  forma_pagamento: "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX";
  observacoes?: string;
  itens: VendaItemPayload[];
};

export type VendaFilters = {
  cliente_nome?: string;
  forma_pagamento?: string;
  data_inicial?: string;
  data_final?: string;
  limite?: number;
};

export type VendaItem = {
  id: number;
  almoxarifadoItemId: number;
  codigoItem: string;
  descricaoItem: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type Venda = {
  id: number;
  clienteNome: string;
  clienteDocumento: string;
  formaPagamento: string;
  valorTotal: number;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
  itens: VendaItem[];
};
