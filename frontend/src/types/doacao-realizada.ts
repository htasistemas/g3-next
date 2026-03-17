export type DoacaoRealizadaItem = {
  id_item_doacao?: string;
  item_id: string;
  codigo_item?: string;
  descricao_item?: string;
  unidade_item?: string;
  quantidade: number;
  observacoes?: string;
  fora_carencia?: boolean;
  carencia_dias_aplicada?: number;
  autorizado_por_nome?: string;
  autorizacao_carencia_em?: string;
  ultima_entrega_em?: string;
};

export type DoacaoRealizada = {
  id_doacao_realizada?: string;
  beneficiario_id?: string;
  vinculo_familiar_id?: string;
  beneficiario_nome?: string;
  familia_nome?: string;
  tipo_doacao: string;
  situacao: string;
  responsavel?: string;
  observacoes?: string;
  data_doacao: string;
  total_itens?: number;
  possui_item_fora_carencia?: boolean;
  autorizar_fora_carencia?: boolean;
  senha_administrativa?: string;
  itens: DoacaoRealizadaItem[];
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type DoacaoRealizadaFiltro = {
  beneficiario_nome?: string;
  tipo_doacao?: string;
  situacao?: string;
  data_inicial?: string;
  data_final?: string;
};

export type DoacaoRealizadaListaResponse = {
  doacoes: DoacaoRealizada[];
};

export type DoacaoRealizadaItemResponse = {
  doacao: DoacaoRealizada;
};
