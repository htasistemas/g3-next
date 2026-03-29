export type ChecklistPrioridade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type ChecklistStatus = "PENDENTE" | "CONCLUIDO" | "ATRASADO" | "DISPENSADO" | "NAO_SE_APLICA";
export type ChecklistModeloTipo = "INSTITUCIONAL" | "SETOR" | "FUNCAO" | "USUARIO";

export type ChecklistExecucao = {
  id: string;
  modeloId?: string;
  modeloItemId?: string;
  modeloNome?: string;
  modeloTipo?: ChecklistModeloTipo;
  usuarioId: number;
  usuarioNome?: string;
  unidadeId?: number;
  unidadeNome?: string;
  setor?: string;
  cargo?: string;
  referenciaData: string;
  semanaInicio: string;
  diaSemana: number;
  tituloAtividade: string;
  descricaoDetalhada?: string;
  horarioPrevisto?: string;
  prioridade: ChecklistPrioridade;
  alertaAtivo: boolean;
  horarioAlerta?: string;
  observacaoObrigatoria: boolean;
  atividadeCritica: boolean;
  status: ChecklistStatus;
  observacaoUsuario?: string;
  concluidoEm?: string;
  concluidoPorNome?: string;
  dispensadoEm?: string;
  dispensadoPorNome?: string;
  motivoDispensa?: string;
  naoAplicavelMotivo?: string;
  ativo: boolean;
  geradoAutomaticamente: boolean;
  origem: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type ChecklistHistorico = {
  id: string;
  referenciaTipo: "EXECUCAO" | "MODELO" | "CONFIGURACAO";
  execucaoId?: string;
  modeloId?: string;
  modeloItemId?: string;
  configuracaoId?: string;
  acao: string;
  statusAnterior?: string;
  statusNovo?: string;
  usuarioResponsavelNome?: string;
  observacao?: string;
  motivo?: string;
  origem?: string;
  dados?: Record<string, unknown>;
  criadoEm: string;
};

export type ChecklistModeloItem = {
  id?: string;
  diaSemana: number;
  titulo: string;
  descricaoDetalhada?: string;
  horarioPrevisto?: string | null;
  prioridade: ChecklistPrioridade;
  alertaAtivo: boolean;
  horarioAlerta?: string | null;
  observacaoObrigatoria: boolean;
  atividadeCritica: boolean;
  ordem: number;
  ativo: boolean;
};

export type ChecklistModelo = {
  id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  tipo: ChecklistModeloTipo;
  usuarioId?: number | null;
  unidadeId?: number | null;
  unidadeNome?: string;
  setor?: string;
  cargo?: string;
  ativo: boolean;
  itens: ChecklistModeloItem[];
};

export type ChecklistConfiguracao = {
  id: string;
  sabadoAtivo: boolean;
  domingoAtivo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type ChecklistIndicadores = {
  resumo: {
    total: number;
    concluidas: number;
    pendentes: number;
    atrasadas: number;
    dispensadas: number;
    naoAplicaveis: number;
    criticasNaoConcluidas: number;
    percentualConclusao: number;
  };
  cumprimentoPorUsuario: Array<{
    usuarioId: number;
    usuarioNome: string;
    percentual: number;
    total: number;
    concluidas: number;
  }>;
  cumprimentoPorUnidade: Array<{
    unidadeId?: number;
    unidadeNome: string;
    percentual: number;
    total: number;
  }>;
  cumprimentoPorSetor: Array<{
    setor: string;
    percentual: number;
    total: number;
  }>;
  tarefasMaisAtrasadas: Array<{
    tituloAtividade: string;
    quantidade: number;
  }>;
  tarefasMaisRecorrentes: Array<{
    tituloAtividade: string;
    quantidade: number;
  }>;
};

export type ChecklistFiltros = {
  usuarioId?: number;
  unidadeId?: number;
  periodoInicio?: string;
  periodoFim?: string;
  status?: ChecklistStatus;
  prioridade?: ChecklistPrioridade;
  diaSemana?: number;
  tipoModelo?: ChecklistModeloTipo;
  somentePendentes?: boolean;
  somenteAtrasados?: boolean;
  termo?: string;
};

export type ChecklistModeloPayload = {
  nome: string;
  descricao?: string;
  tipo: ChecklistModeloTipo;
  usuarioId?: number | null;
  unidadeId?: number | null;
  setor?: string;
  cargo?: string;
  ativo?: boolean;
  itens: Array<{
    diaSemana: number;
    titulo: string;
    descricaoDetalhada?: string;
    horarioPrevisto?: string | null;
    prioridade: ChecklistPrioridade;
    alertaAtivo?: boolean;
    horarioAlerta?: string | null;
    observacaoObrigatoria?: boolean;
    atividadeCritica?: boolean;
    ordem?: number;
    ativo?: boolean;
  }>;
};
