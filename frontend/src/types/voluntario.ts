export type VoluntarioStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";
export type VoluntarioEscalaStatus = "ATIVA" | "PAUSADA" | "INATIVA";
export type VoluntarioEscalaDia =
  | "SEGUNDA"
  | "TERCA"
  | "QUARTA"
  | "QUINTA"
  | "SEXTA"
  | "SABADO"
  | "DOMINGO";

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
  escalas?: VoluntarioEscala[];
};

export type VoluntarioEscala = {
  id_escala?: string;
  voluntario_id: string;
  sala_id: string;
  sala_nome: string;
  unidade_nome?: string;
  atividade_tipo: string;
  titulo?: string;
  dias_semana: VoluntarioEscalaDia[];
  hora_inicio: string;
  hora_fim: string;
  carga_horaria_semanal: number;
  status: VoluntarioEscalaStatus;
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
};

export type VoluntarioEscalaPayload = {
  id_escala?: string;
  voluntario_id: string;
  sala_id: string;
  atividade_tipo: string;
  titulo?: string;
  dias_semana: VoluntarioEscalaDia[];
  hora_inicio: string;
  hora_fim: string;
  carga_horaria_semanal?: number;
  status: VoluntarioEscalaStatus;
  observacoes?: string;
};

export type VoluntarioListaResponse = {
  voluntarios: Voluntario[];
};

export type VoluntarioItemResponse = {
  voluntario: Voluntario;
};

export type VoluntarioEscalaListaResponse = {
  escalas: VoluntarioEscala[];
};

export type VoluntarioEscalaItemResponse = {
  escala: VoluntarioEscala;
};

export type VoluntarioFiltro = {
  nome?: string;
  status?: string;
  cpf?: string;
  email?: string;
};
