export type TipoMovimentacaoAlmoxarifado = "Entrada" | "Saida" | "Ajuste";
export type DirecaoAjusteAlmoxarifado = "increase" | "decrease";

export type ItemAlmoxarifado = {
  id_item?: string;
  codigo: string;
  codigo_barras?: string;
  descricao: string;
  categoria: string;
  unidade: string;
  localizacao?: string;
  localizacao_interna?: string;
  estoque_atual: number;
  estoque_fisico?: number;
  estoque_disponivel?: number;
  estoque_montavel_kit?: number;
  estoque_minimo: number;
  valor_unitario: number;
  is_kit: boolean;
  possui_composicao_kit?: boolean;
  situacao: string;
  validade?: string;
  ignorar_validade?: boolean;
  observacoes?: string;
};

export type MovimentacaoAlmoxarifado = {
  id_movimentacao?: string;
  data_movimentacao: string;
  tipo: TipoMovimentacaoAlmoxarifado;
  codigo_item: string;
  descricao_item?: string;
  quantidade: number;
  saldo_apos?: number;
  referencia?: string;
  responsavel?: string;
  observacoes?: string;
  direcao_ajuste?: DirecaoAjusteAlmoxarifado | string;
  gerar_itens_kit?: boolean;
};

export type ComposicaoKitItem = {
  id?: number;
  produto_item_id: number;
  produto_item_codigo?: string;
  produto_item_descricao?: string;
  quantidade_item: number;
};

export type VinculoKitMovimentacao = {
  movimentacao_id: number;
  data_movimentacao: string;
  tipo: string;
  item_codigo: string;
  item_descricao: string;
  quantidade: number;
  saldo_apos: number;
};
