export type ProjetoPrioridade = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
export type ProjetoStatus = "NAO_INICIADO" | "EM_ANDAMENTO" | "PARADO" | "CONCLUIDO" | "CANCELADO";
export type ProjetoArea =
  | "ASSISTENCIA_SOCIAL"
  | "EDUCACAO"
  | "SAUDE"
  | "ALIMENTACAO"
  | "CAPACITACAO_PROFISSIONAL"
  | "CULTURA"
  | "ESPORTE"
  | "HABITACAO"
  | "CAPTACAO_RECURSOS"
  | "OUTRO";

export type ProjetoTarefaTipo =
  | "PLANEJAMENTO"
  | "EXECUCAO"
  | "ATENDIMENTO"
  | "COMPRA"
  | "PRESTACAO_CONTAS"
  | "RELATORIO"
  | "REUNIAO"
  | "MONITORAMENTO"
  | "DIVULGACAO"
  | "OUTRO";

export type ProjetoTarefaStatus = "NAO_INICIADO" | "EM_ANDAMENTO" | "PARADO" | "CONCLUIDO";

export type ProjetoInput = {
  nome: string;
  descricao_completa?: string;
  objetivo_geral?: string;
  publico_alvo?: string;
  unidade_assistencial_id?: string;
  responsavel: string;
  equipe_envolvida?: string[];
  data_inicio: string;
  prazo_previsto: string;
  data_termino_real?: string;
  prioridade: ProjetoPrioridade;
  status: ProjetoStatus;
  area_projeto: ProjetoArea;
  fonte_recurso?: string;
  observacoes?: string;
  ativo?: boolean;
};

export type ProjetoTarefaInput = {
  titulo: string;
  descricao?: string;
  tipo_tarefa: ProjetoTarefaTipo;
  responsavel: string;
  prioridade: ProjetoPrioridade;
  status: ProjetoTarefaStatus;
  data_prevista?: string;
  data_conclusao?: string;
  observacoes?: string;
  ordem_kanban?: number;
  ativo?: boolean;
};

export type ProjetoFilters = {
  nome?: string;
  responsavel?: string;
  status?: ProjetoStatus;
  prioridade?: ProjetoPrioridade;
  area_projeto?: ProjetoArea;
  data_inicio_de?: string;
  data_inicio_ate?: string;
  prazo_de?: string;
  prazo_ate?: string;
  atrasados?: boolean;
  concluidos?: boolean;
  unidade_assistencial_id?: string;
  ativo?: boolean;
};

export type ProjetoRow = {
  id: bigint;
  tenant_id: string;
  nome: string;
  descricao_completa: string | null;
  objetivo_geral: string | null;
  publico_alvo: string | null;
  unidade_assistencial_id: bigint | null;
  unidade_assistencial_nome: string | null;
  responsavel: string;
  equipe_envolvida: unknown;
  data_inicio: Date;
  prazo_previsto: Date;
  data_termino_real: Date | null;
  prioridade: ProjetoPrioridade;
  status: ProjetoStatus;
  area_projeto: ProjetoArea;
  fonte_recurso: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: bigint | null;
  updated_by: bigint | null;
  total_tarefas: bigint | number | null;
  tarefas_concluidas: bigint | number | null;
  percentual_evolucao: number | string | null;
};

export type ProjetoTarefaRow = {
  id: bigint;
  tenant_id: string;
  projeto_id: bigint;
  titulo: string;
  descricao: string | null;
  tipo_tarefa: ProjetoTarefaTipo;
  responsavel: string;
  prioridade: ProjetoPrioridade;
  status: ProjetoTarefaStatus;
  data_prevista: Date | null;
  data_conclusao: Date | null;
  observacoes: string | null;
  ordem_kanban: number | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: bigint | null;
  updated_by: bigint | null;
};

export type ProjetoHistoricoRow = {
  id: bigint;
  tenant_id: string;
  projeto_id: bigint;
  tarefa_id: bigint | null;
  tipo_evento: string;
  descricao: string;
  detalhes_json: unknown;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  created_at: Date;
};

export type ProjetoDashboardResumoRow = {
  total_projetos: bigint | number | null;
  projetos_em_andamento: bigint | number | null;
  projetos_parados: bigint | number | null;
  projetos_concluidos: bigint | number | null;
  projetos_atrasados: bigint | number | null;
  percentual_medio_evolucao: number | string | null;
  tarefas_abertas: bigint | number | null;
  tarefas_concluidas: bigint | number | null;
};

export type ProjetoDashboardFrequenciaRow = {
  chave: string;
  total: bigint | number | null;
};

export type ProjetoDashboardPrazoRow = {
  faixa: string;
  total: bigint | number | null;
};
