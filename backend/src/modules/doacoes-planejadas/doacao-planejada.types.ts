export type DoacaoPlanejadaInput = {
  beneficiario_id?: number;
  vinculo_familiar_id?: number;
  item_id: number;
  quantidade: number;
  data_prevista: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  motivo_cancelamento?: string;
};

export type DoacaoPlanejadaFilters = {
  beneficiario_id?: string;
  vinculo_familiar_id?: string;
  status?: string;
  data_inicial?: string;
  data_final?: string;
};

