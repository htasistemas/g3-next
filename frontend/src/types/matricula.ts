export type MatriculaInscricao = {
  id_matricula_item?: string;
  beneficiario_nome: string;
  cpf?: string;
  telefone?: string;
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

export type MatriculaFilaEspera = {
  id_fila_espera?: string;
  beneficiario_nome: string;
  cpf?: string;
  telefone?: string;
  data_entrada?: string;
};

export type Matricula = {
  id_matricula?: string;
  tipo: string;
  nome: string;
  descricao?: string;
  imagem?: string;
  imagem_thumbnail?: string;
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
  sala_id?: string;
  sala_nome?: string;
  status: string;
  data_triagem?: string;
  data_encaminhamento?: string;
  data_conclusao?: string;
  total_matriculas?: number;
  total_fila_espera?: number;
  matriculas?: MatriculaInscricao[];
  fila_espera?: MatriculaFilaEspera[];
  data_cadastro?: string;
  data_atualizacao?: string;
};

export type MatriculaListaResponse = {
  matriculas: Matricula[];
};

export type MatriculaItemResponse = {
  matricula: Matricula;
};

export type MatriculaFiltro = {
  nome?: string;
  tipo?: string;
  status?: string;
  profissional?: string;
  beneficiario?: string;
};

export type MatriculaBeneficiarioCatalogo = {
  id_beneficiario: string;
  nome_completo: string;
  cpf?: string;
  codigo?: string;
  telefone?: string;
  email?: string;
};

export type MatriculaProfissionalCatalogo = {
  id_profissional: string;
  nome_completo: string;
  categoria: string;
};

export type MatriculaSalaCatalogo = {
  id_sala: string;
  nome: string;
  unidade_nome?: string;
};

export type MatriculaResumoCatalogo = {
  cursosNoCatalogo: number;
  totalVagas: number;
  vagasDisponiveis: number;
  inscricoesAtivas: number;
};

export type MatriculaPresencaStatus = "PRESENTE" | "AUSENTE";
export type MatriculaPresencaDataStatus = "GERADA" | "PREENCHIDA" | "CANCELADA";

export type MatriculaPresencaItem = {
  matricula_id: string;
  beneficiario_nome?: string;
  cpf?: string;
  status: MatriculaPresencaStatus;
};

export type MatriculaPresencaResponse = {
  data_aula: string;
  presencas: MatriculaPresencaItem[];
};

export type MatriculaPresencaData = {
  id: string;
  data_aula: string;
  status: MatriculaPresencaDataStatus;
  observacoes?: string;
  total_presencas?: number;
  total_anexos?: number;
  criado_em?: string;
  atualizado_em?: string;
};
