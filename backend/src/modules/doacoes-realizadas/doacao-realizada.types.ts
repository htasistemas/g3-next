export type DoacaoRealizadaItemInput = {
  item_id: number;
  quantidade: number;
  observacoes?: string;
};

export type DoacaoRealizadaInput = {
  beneficiario_id?: number;
  vinculo_familiar_id?: number;
  tipo_doacao: string;
  situacao: string;
  responsavel?: string;
  observacoes?: string;
  data_doacao: string;
  itens: DoacaoRealizadaItemInput[];
};

export type DoacaoRealizadaFilters = {
  beneficiario_nome?: string;
  tipo_doacao?: string;
  situacao?: string;
  data_inicial?: string;
  data_final?: string;
};
