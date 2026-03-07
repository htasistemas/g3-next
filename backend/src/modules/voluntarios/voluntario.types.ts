export const voluntarioStatusValues = ["ATIVO", "INATIVO", "BLOQUEADO"] as const;

export type VoluntarioStatus = (typeof voluntarioStatusValues)[number];

export type VoluntarioInput = {
  profissional_id?: number;
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
};

export type VoluntarioFilters = {
  nome?: string;
  status?: string;
  cpf?: string;
  email?: string;
};
