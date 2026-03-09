export type DoacaoPlanejada = {
  id_doacao_planejada?: string;
  beneficiario_id?: string;
  vinculo_familiar_id?: string;
  beneficiario_nome?: string;
  familia_nome?: string;
  item_id: string;
  item_codigo?: string;
  item_descricao?: string;
  item_unidade?: string;
  quantidade: number;
  data_prevista: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  motivo_cancelamento?: string;
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type DoacaoPlanejadaFiltro = {
  beneficiario_id?: string;
  vinculo_familiar_id?: string;
  status?: string;
  data_inicial?: string;
  data_final?: string;
};

export type DoacaoPlanejadaListaResponse = {
  doacoes: DoacaoPlanejada[];
};

export type DoacaoPlanejadaItemResponse = {
  doacao: DoacaoPlanejada;
};

