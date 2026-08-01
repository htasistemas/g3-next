export type DiretoriaUnidadeInput = {
  id?: string | number;
  nome_completo: string;
  documento: string;
  funcao: string;
  mandato_inicio?: string;
  mandato_fim?: string;
};

export type SalaUnidadeInput = {
  id?: string | number;
  nome: string;
  capacidade_maxima?: number | string;
  ativo?: boolean | string;
};

export type UnidadeAssistencialInput = {
  nome_fantasia: string;
  tipo_unidade?: "ASSISTENCIAL" | "ENSINO";
  razao_social?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  site?: string;
  horario_funcionamento?: string;
  observacoes?: string;
  unidade_principal?: boolean;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  cidade?: string;
  estado?: string;
  zona?: string;
  subzona?: string;
  latitude?: string;
  longitude?: string;
  raio_ponto_metros?: number;
  accuracy_max_ponto_metros?: number;
  ip_validacao_ponto?: string;
  ips_publicos_ponto?: string;
  redes_locais_ponto?: string;
  modo_validacao_ponto?: string;
  ping_timeout_ms?: number;
  logomarca?: string;
  logomarca_relatorio?: string;
  diretoria?: DiretoriaUnidadeInput[];
  salas?: SalaUnidadeInput[];
};

export type UnidadeAssistencialFilters = {
  tipo_unidade?: "ASSISTENCIAL" | "ENSINO";
  nome_fantasia?: string;
  cnpj?: string;
  cidade?: string;
  unidade_principal?: boolean;
};
