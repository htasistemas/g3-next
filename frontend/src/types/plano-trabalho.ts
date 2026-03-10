export type PlanoStatus =
  | "EM_ELABORACAO"
  | "ENVIADO_ANALISE"
  | "APROVADO"
  | "EM_EXECUCAO"
  | "CONCLUIDO"
  | "REPROVADO";

export type PlanoEtapa = {
  id?: string;
  descricao: string;
  status?: string;
  dataInicioPrevista?: string;
  dataFimPrevista?: string;
  dataConclusao?: string;
  responsavel?: string;
};

export type PlanoAtividade = {
  id?: string;
  descricao: string;
  justificativa?: string;
  publicoAlvo?: string;
  localExecucao?: string;
  produtoEsperado?: string;
  etapas: PlanoEtapa[];
};

export type PlanoMeta = {
  id?: string;
  codigo?: string;
  descricao: string;
  indicador?: string;
  unidadeMedida?: string;
  quantidadePrevista?: number;
  resultadoEsperado?: string;
  atividades: PlanoAtividade[];
};

export type PlanoCronograma = {
  id?: string;
  referenciaTipo?: string;
  referenciaId?: string;
  referenciaDescricao?: string;
  competencia: string;
  descricaoResumida?: string;
  valorPrevisto?: number;
  fonteRecurso?: string;
  naturezaDespesa?: string;
  observacoes?: string;
};

export type PlanoEquipe = {
  id?: string;
  nome: string;
  funcao?: string;
  cpf?: string;
  cargaHoraria?: string;
  tipoVinculo?: string;
  contato?: string;
};

export type PlanoTrabalhoPayload = {
  id?: string;
  codigoInterno?: string;
  titulo: string;
  descricaoGeral: string;
  status: PlanoStatus | string;
  orgaoConcedente?: string;
  orgaoOutroDescricao?: string;
  areaPrograma?: string;
  dataElaboracao?: string;
  dataAprovacao?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  termoFomentoId: string;
  numeroProcesso?: string;
  modalidade?: string;
  observacoesVinculacao?: string;
  arquivoFormato?: string;
  metas: PlanoMeta[];
  cronograma: PlanoCronograma[];
  equipe: PlanoEquipe[];
};

export type PlanoTrabalho = PlanoTrabalhoPayload & {
  id: string;
  codigoInterno: string;
  termoFomento?: { id: string; numero: string; objeto?: string };
};
