export type PlanoEtapaInput = {
  id?: string;
  descricao: string;
  status?: string | null;
  dataInicioPrevista?: string | null;
  dataFimPrevista?: string | null;
  dataConclusao?: string | null;
  responsavel?: string | null;
};

export type PlanoAtividadeInput = {
  id?: string;
  descricao: string;
  justificativa?: string | null;
  publicoAlvo?: string | null;
  localExecucao?: string | null;
  produtoEsperado?: string | null;
  etapas: PlanoEtapaInput[];
};

export type PlanoMetaInput = {
  id?: string;
  codigo?: string | null;
  descricao: string;
  indicador?: string | null;
  unidadeMedida?: string | null;
  quantidadePrevista?: number | null;
  resultadoEsperado?: string | null;
  atividades: PlanoAtividadeInput[];
};

export type PlanoCronogramaInput = {
  id?: string;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  referenciaDescricao?: string | null;
  competencia: string;
  descricaoResumida?: string | null;
  valorPrevisto?: number | null;
  fonteRecurso?: string | null;
  naturezaDespesa?: string | null;
  observacoes?: string | null;
};

export type PlanoEquipeInput = {
  id?: string;
  nome: string;
  funcao?: string | null;
  cpf?: string | null;
  cargaHoraria?: string | null;
  tipoVinculo?: string | null;
  contato?: string | null;
};

export type PlanoTrabalhoInput = {
  id?: string;
  codigoInterno?: string | null;
  titulo: string;
  descricaoGeral: string;
  status: string;
  orgaoConcedente?: string | null;
  orgaoOutroDescricao?: string | null;
  areaPrograma?: string | null;
  dataElaboracao?: string | null;
  dataAprovacao?: string | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  termoFomentoId: string;
  numeroProcesso?: string | null;
  modalidade?: string | null;
  observacoesVinculacao?: string | null;
  arquivoFormato?: string | null;
  metas: PlanoMetaInput[];
  cronograma: PlanoCronogramaInput[];
  equipe: PlanoEquipeInput[];
};

export type PlanoTrabalhoRow = {
  id: bigint;
  codigo_interno: string;
  titulo: string;
  descricao_geral: string;
  status: string;
  orgao_concedente: string | null;
  orgao_outro_descricao: string | null;
  area_programa: string | null;
  data_elaboracao: Date | null;
  data_aprovacao: Date | null;
  vigencia_inicio: Date | null;
  vigencia_fim: Date | null;
  termo_fomento_id: bigint;
  numero_processo: string | null;
  modalidade: string | null;
  observacoes_vinculacao: string | null;
  arquivo_formato: string | null;
  criado_em: Date;
  atualizado_em: Date;
  termo_numero: string | null;
  termo_objeto: string | null;
};

export type PlanoMetaRow = {
  id: bigint;
  plano_trabalho_id: bigint;
  codigo: string | null;
  descricao: string;
  indicador: string | null;
  unidade_medida: string | null;
  quantidade_prevista: number | null;
  resultado_esperado: string | null;
  ordem: number;
};

export type PlanoAtividadeRow = {
  id: bigint;
  meta_id: bigint;
  descricao: string;
  justificativa: string | null;
  publico_alvo: string | null;
  local_execucao: string | null;
  produto_esperado: string | null;
  ordem: number;
};

export type PlanoEtapaRow = {
  id: bigint;
  atividade_id: bigint;
  descricao: string;
  status: string | null;
  data_inicio_prevista: Date | null;
  data_fim_prevista: Date | null;
  data_conclusao: Date | null;
  responsavel: string | null;
  ordem: number;
};

export type PlanoCronogramaRow = {
  id: bigint;
  plano_trabalho_id: bigint;
  referencia_tipo: string | null;
  referencia_id: string | null;
  referencia_descricao: string | null;
  competencia: string;
  descricao_resumida: string | null;
  valor_previsto: number | null;
  fonte_recurso: string | null;
  natureza_despesa: string | null;
  observacoes: string | null;
  ordem: number;
};

export type PlanoEquipeRow = {
  id: bigint;
  plano_trabalho_id: bigint;
  nome: string;
  funcao: string | null;
  cpf: string | null;
  carga_horaria: string | null;
  tipo_vinculo: string | null;
  contato: string | null;
  ordem: number;
};
