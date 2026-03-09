export type MatriculaInscricaoInput = {
  beneficiario_nome: string;
  cpf?: string;
  email?: string;
  status?: string;
  data_matricula?: string;
  data_agendada?: string;
  hora_agendada?: string;
  status_agendamento?: string;
  profissional_id?: string;
  profissional_nome?: string;
  profissional_tipo?: string;
  confirmacao_presenca?: boolean;
};

export type MatriculaFilaEsperaInput = {
  beneficiario_nome: string;
  cpf?: string;
  data_entrada?: string;
};

export type MatriculaInput = {
  tipo: string;
  nome: string;
  descricao?: string;
  imagem?: string;
  vagas_totais: number;
  vagas_disponiveis?: number;
  carga_horaria?: number;
  horario_inicial?: string;
  duracao_horas: number;
  dias_semana?: string[];
  faixa_etaria?: string[];
  vaga_preferencial_idosos?: boolean;
  sexo_permitido?: string;
  restricoes?: string;
  profissional?: string;
  instituicao_parceira?: string;
  sala_id?: number;
  status: string;
  data_triagem?: string;
  data_encaminhamento?: string;
  data_conclusao?: string;
  matriculas?: MatriculaInscricaoInput[];
  fila_espera?: MatriculaFilaEsperaInput[];
};

export type MatriculaFilters = {
  nome?: string;
  tipo?: string;
  status?: string;
  profissional?: string;
  beneficiario?: string;
};

export type MatriculaPresencaStatus = "PRESENTE" | "AUSENTE";
export type MatriculaPresencaDataStatus = "GERADA" | "PREENCHIDA" | "CANCELADA";

export type MatriculaPresencaDataInput = {
  data_aula: string;
  observacoes?: string;
};

export type MatriculaPresencaDataUpdateInput = {
  observacoes?: string;
  status?: MatriculaPresencaDataStatus;
};

export type MatriculaPresencaItemInput = {
  matricula_id: string;
  status: MatriculaPresencaStatus;
};

export type MatriculaPresencaSalvarInput = {
  data_aula: string;
  presencas: MatriculaPresencaItemInput[];
};
