export type AlmoxarifadoItemInput = {
  codigo?: string;
  codigo_barras?: string | null;
  descricao: string;
  categoria: string;
  unidade: string;
  localizacao?: string | null;
  localizacao_interna?: string | null;
  estoque_atual?: number;
  estoque_minimo?: number;
  valor_unitario?: number;
  is_kit?: boolean;
  situacao: string;
  validade?: string | null;
  ignorar_validade?: boolean;
  observacoes?: string | null;
};

export type AlmoxarifadoMovimentacaoInput = {
  data_movimentacao: string;
  tipo: string;
  codigo_item: string;
  quantidade: number;
  referencia?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  direcao_ajuste?: string | null;
  gerar_itens_kit?: boolean | null;
};

export type AlmoxarifadoKitComposicaoInput = {
  produto_item_id: number;
  quantidade_item: number;
};

export type AlmoxarifadoItemRow = {
  id: bigint;
  codigo: string;
  codigo_barras: string | null;
  descricao: string;
  categoria: string;
  unidade: string;
  localizacao: string | null;
  localizacao_interna: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  valor_unitario: number;
  is_kit: boolean;
  situacao: string;
  validade: Date | null;
  ignorar_validade: boolean;
  observacoes: string | null;
  estoque_fisico?: number;
  estoque_disponivel?: number;
  estoque_montavel_kit?: number;
  possui_composicao_kit?: boolean;
};

export type AlmoxarifadoMovimentacaoRow = {
  id: bigint;
  item_id: bigint;
  data_movimentacao: Date;
  tipo: string;
  quantidade: number;
  saldo_apos: number;
  referencia: string | null;
  responsavel: string | null;
  observacoes: string | null;
  direcao_ajuste: string | null;
  codigo_item: string;
  descricao_item: string;
};

export type AlmoxarifadoKitComposicaoRow = {
  id: bigint;
  produto_kit_id: bigint;
  produto_item_id: bigint;
  quantidade_item: number;
  produto_item_codigo: string;
  produto_item_descricao: string;
};
