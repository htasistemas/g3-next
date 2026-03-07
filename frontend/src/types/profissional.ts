export type ProfissionalStatus =
  | "ATIVO"
  | "INATIVO"
  | "DESATUALIZADO"
  | "INCOMPLETO"
  | "EM_ANALISE"
  | "BLOQUEADO";

export type Profissional = {
  id_profissional?: string;
  nome_completo: string;
  cpf?: string;
  nome_social?: string;
  apelido?: string;
  data_nascimento?: string;
  foto_3x4?: string;
  sexo_biologico?: string;
  identidade_genero?: string;
  cor_raca?: string;
  estado_civil?: string;
  nacionalidade?: string;
  naturalidade_cidade?: string;
  naturalidade_uf?: string;
  nome_mae?: string;
  nome_pai?: string;
  vinculo?: string;
  categoria: string;
  registro_conselho?: string;
  especialidade?: string;
  email?: string;
  telefone?: string;
  unidade?: string;
  sala_atendimento?: string;
  carga_horaria?: number;
  disponibilidade?: string[];
  canais_atendimento?: string[];
  status?: ProfissionalStatus;
  tags?: string[];
  resumo?: string;
  observacoes?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  ponto_referencia?: string;
  municipio?: string;
  zona?: string;
  subzona?: string;
  uf?: string;
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type ProfissionalListaResponse = {
  profissionais: Profissional[];
};

export type ProfissionalItemResponse = {
  profissional: Profissional;
};

export type ProfissionalFiltro = {
  nome?: string;
  categoria?: string;
  status?: string;
  cpf?: string;
  vinculo?: string;
};
