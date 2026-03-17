export type DoacaoRealizadaItemInput = {
  item_id: number;
  quantidade: number;
  observacoes?: string;
  fora_carencia?: boolean;
  carencia_dias_aplicada?: number;
  autorizado_por_usuario_id?: number;
  autorizado_por_nome?: string;
  autorizacao_carencia_em?: string;
  ultima_entrega_em?: string;
};

export type DoacaoRealizadaInput = {
  beneficiario_id?: number;
  vinculo_familiar_id?: number;
  tipo_doacao: string;
  situacao: string;
  responsavel?: string;
  observacoes?: string;
  data_doacao: string;
  autorizar_fora_carencia?: boolean;
  senha_administrativa?: string;
  itens: DoacaoRealizadaItemInput[];
};

export type DoacaoRealizadaFilters = {
  beneficiario_nome?: string;
  tipo_doacao?: string;
  situacao?: string;
  data_inicial?: string;
  data_final?: string;
};
