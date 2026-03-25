export type DoadorInput = {
  nome: string;
  tipo_pessoa?: string;
  documento?: string;
  responsavel_empresa?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
};

export type RegistroDoacaoItemInput = {
  descricao: string;
  quantidade: number;
  unidade?: string;
  valor_unitario?: number;
  valor_total?: number;
  marca?: string;
  modelo?: string;
  conservacao?: string;
  observacoes?: string;
};

export type RegistroDoacaoInput = {
  doador_id?: number;
  conta_recebimento_id?: number;
  numero_recibo?: string;
  tipo_doacao: string;
  descricao?: string;
  quantidade_itens?: number;
  valor_medio?: number;
  valor_total?: number;
  valor?: number;
  data_recebimento: string;
  forma_recebimento?: string;
  recorrente?: boolean;
  periodicidade?: string;
  proxima_cobranca?: string;
  status: string;
  observacoes?: string;
  itens?: RegistroDoacaoItemInput[];
};

export type RegistroDoacaoFilters = {
  doador_nome?: string;
  tipo_doacao?: string;
  status?: string;
  data_inicial?: string;
  data_final?: string;
};
