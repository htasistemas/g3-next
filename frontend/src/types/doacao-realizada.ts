export type DoacaoRealizadaItem = {
  id_item_doacao?: string;
  item_id: string;
  codigo_item?: string;
  descricao_item?: string;
  unidade_item?: string;
  quantidade: number;
  observacoes?: string;
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
