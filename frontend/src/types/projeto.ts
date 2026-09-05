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

export type ProjetoIndicador = {
  id: number;
  projeto_id: number;
  nome: string;
  descricao?: string | null;
  tipo: "PROCESSO" | "PRODUTO" | "RESULTADO" | "IMPACTO";
  unidade_medida: string;
  linha_base: number | null;
  meta: number;
  valor_atual: number;
  periodicidade: "UNICA" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  fonte_dado?: string | null;
  responsavel?: string | null;
  status: "ATIVO" | "INATIVO";
};

export type ProjetoIndicadorPayload = Omit<ProjetoIndicador, "id" | "projeto_id" | "linha_base" | "valor_atual" | "status"> & {
  linha_base?: number;
  valor_atual?: number;
  status?: "ATIVO" | "INATIVO";
};

export type ProjetoIndicadorMedicao = { id: number; indicador_id: number; competencia: string; valor: number; observacao?: string | null; registrado_em: string };
export type ProjetoIndicadorEvidencia = { id: number; indicador_id: number; nome_arquivo: string; referencia_logica: string; mime_type?: string | null; tamanho_bytes?: number | null; checksum?: string | null; enviado_em: string; ativo: boolean };
export type ProjetoImpactoDashboard = { resumo: { totalIndicadores: number; indicadoresAtivos: number; metaTotal: number; realizadoTotal: number; percentualMedio: number }; porTipo: Array<{ tipo: string; total: number }>; evolucao: Array<{ competencia: string; total: number }> };

export type ProjetoFiltros = {
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

export type ProjetoHistorico = {
  id: string;
  projetoId: string;
  tarefaId?: string | null;
  tipoEvento: string;
  descricao: string;
  detalhes?: unknown;
  usuarioId?: string | null;
  usuarioNome: string;
  createdAt: string;
};

export type ProjetoTarefa = {
  id: string;
  projetoId: string;
  titulo: string;
  descricao: string;
  tipoTarefa: ProjetoTarefaTipo;
  tipoTarefaLabel: string;
  responsavel: string;
  prioridade: ProjetoPrioridade;
  prioridadeLabel: string;
  status: ProjetoTarefaStatus;
  statusLabel: string;
  dataPrevista?: string | null;
  dataConclusao?: string | null;
  observacoes: string;
  ordemKanban: number;
  ativo: boolean;
  atrasada: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Projeto = {
  id: string;
  nome: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  objetivoGeral: string;
  publicoAlvo: string;
  unidadeAssistencialId?: string | null;
  unidadeAssistencialNome: string;
  responsavel: string;
  equipeEnvolvida: string[];
  dataInicio?: string | null;
  prazoPrevisto?: string | null;
  dataTerminoReal?: string | null;
  prioridade: ProjetoPrioridade;
  prioridadeLabel: string;
  status: ProjetoStatus;
  statusLabel: string;
  areaProjeto: ProjetoArea;
  areaProjetoLabel: string;
  fonteRecurso: string;
  observacoes: string;
  ativo: boolean;
  percentualEvolucao: number;
  quantidadeTarefas: number;
  quantidadeTarefasConcluidas: number;
  indicadorPrazo: "CONCLUIDO" | "ATRASADO" | "NO_PRAZO";
  createdAt: string;
  updatedAt: string;
  tarefas: ProjetoTarefa[];
  historico: ProjetoHistorico[];
};

export type ProjetoDashboardResumo = {
  totalProjetos: number;
  projetosEmAndamento: number;
  projetosParados: number;
  projetosConcluidos: number;
  projetosAtrasados: number;
  percentualMedioEvolucao: number;
  tarefasAbertas: number;
  tarefasConcluidas: number;
};

export type ProjetoDashboardItem = {
  chave?: string;
  faixa?: string;
  total: number;
};

export type ProjetoDashboard = {
  resumo: ProjetoDashboardResumo;
  graficos: {
    projetosPorStatus: ProjetoDashboardItem[];
    projetosPorPrioridade: ProjetoDashboardItem[];
    evolucaoProjetos: ProjetoDashboardItem[];
    tarefasPorResponsavel: ProjetoDashboardItem[];
    projetosVencendo: ProjetoDashboardItem[];
  };
};

export type ProjetoPayload = {
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

export type ProjetoTarefaPayload = {
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

