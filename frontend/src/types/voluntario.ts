export type VoluntarioStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";

export type Voluntario = {
  id_voluntario?: string;
  profissional_id?: string;
  profissional_nome?: string;
  profissional_categoria?: string;
  nome_completo: string;
  cpf: string;
  rg?: string;
  foto_3x4?: string;
  data_nascimento?: string;
  genero?: string;
  profissao?: string;
  motivacao?: string;
  telefone?: string;
  email: string;
  cidade?: string;
  estado?: string;
  area_interesse?: string;
  habilidades?: string;
  idiomas?: string;
  linkedin?: string;
  status?: VoluntarioStatus;
  disponibilidade_dias?: string[];
  disponibilidade_periodos?: string[];
  carga_horaria_semanal?: string;
  presencial?: boolean;
  remoto?: boolean;
  inicio_previsto?: string;
  observacoes?: string;
  documento_identificacao?: string;
  comprovante_endereco?: string;
  aceite_voluntariado?: boolean;
  aceite_imagem?: boolean;
  assinatura_digital?: string;
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

export type VoluntarioListaResponse = {
  voluntarios: Voluntario[];
};

export type VoluntarioItemResponse = {
  voluntario: Voluntario;
};

export type VoluntarioFiltro = {
  nome?: string;
  status?: string;
  cpf?: string;
  email?: string;
};
