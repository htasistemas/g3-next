export type Doador = {
  id_doador?: string;
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
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type RegistroDoacaoItem = {
  id_item?: string;
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

export type RegistroDoacao = {
  id_registro_doacao?: string;
  doador_id?: string;
  doador_nome?: string;
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
  conta_recebimento_id?: string;
  contabilidade_pendente?: boolean;
  lancamentos_gerados?: boolean;
  itens?: RegistroDoacaoItem[];
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type RegistroDoacaoFiltro = {
  doador_nome?: string;
  tipo_doacao?: string;
  status?: string;
  data_inicial?: string;
  data_final?: string;
};

export type RegistroDoacaoListaResponse = {
  registros: RegistroDoacao[];
};

export type RegistroDoacaoItemResponse = {
  registro: RegistroDoacao;
};
