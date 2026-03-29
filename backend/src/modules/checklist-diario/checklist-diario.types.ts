export type ChecklistPermissao =
  | "ADMINISTRADOR"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_PROPRIO"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CONCLUIR_ATIVIDADE"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_INFORMAR_OBSERVACAO"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_REABRIR_ATIVIDADE"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_INDICADORES"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_GERENCIAR_CONFIGURACOES"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_SABADO"
  | "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_DOMINGO";

export type ChecklistUsuarioContexto = {
  id: bigint;
  nome: string;
  setor?: string;
  cargo?: string;
  unidadeNome?: string;
  unidadeId?: bigint;
};

export type ChecklistUsuarioAtual = {
  id: string;
  nomeUsuario: string;
  nome?: string;
  permissoes: string[];
};

export type ChecklistPrioridade = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
export type ChecklistExecucaoStatus =
  | "PENDENTE"
  | "CONCLUIDO"
  | "ATRASADO"
  | "DISPENSADO"
  | "NAO_SE_APLICA";
export type ChecklistModeloTipo = "INSTITUCIONAL" | "SETOR" | "FUNCAO" | "USUARIO";
export type ChecklistHistoricoReferenciaTipo = "EXECUCAO" | "MODELO" | "CONFIGURACAO";

export type ChecklistListagemFiltros = {
  usuarioId?: number;
  unidadeId?: number;
  periodoInicio?: string;
  periodoFim?: string;
  status?: ChecklistExecucaoStatus;
  prioridade?: ChecklistPrioridade;
  diaSemana?: number;
  tipoModelo?: ChecklistModeloTipo;
  somentePendentes?: boolean;
  somenteAtrasados?: boolean;
  termo?: string;
};

export type ChecklistGerarSemanaInput = {
  dataReferencia?: string;
  usuarioId?: number;
  forcar?: boolean;
};

export type ChecklistExecucaoConclusaoInput = {
  observacao?: string;
};

export type ChecklistExecucaoDispensaInput = {
  motivo: string;
  observacao?: string;
};

export type ChecklistExecucaoReaberturaInput = {
  motivo?: string;
  observacao?: string;
};

export type ChecklistConfiguracaoInput = {
  sabadoAtivo: boolean;
  domingoAtivo: boolean;
};

export type ChecklistModeloItemInput = {
  id?: number;
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
};

export type ChecklistModeloInput = {
  nome: string;
  descricao?: string;
  tipo: ChecklistModeloTipo;
  usuarioId?: number | null;
  unidadeId?: number | null;
  setor?: string;
  cargo?: string;
  ativo?: boolean;
  itens: ChecklistModeloItemInput[];
};

export type ChecklistModeloRow = {
  id: bigint;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  tipo: ChecklistModeloTipo;
  usuario_id: bigint | null;
  unidade_id: bigint | null;
  unidade_nome: string | null;
  setor: string | null;
  cargo: string | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type ChecklistModeloItemRow = {
  id: bigint;
  modelo_id: bigint;
  dia_semana: number;
  titulo: string;
  descricao_detalhada: string | null;
  horario_previsto: Date | string | null;
  prioridade: ChecklistPrioridade;
  alerta_ativo: boolean;
  horario_alerta: Date | string | null;
  observacao_obrigatoria: boolean;
  atividade_critica: boolean;
  ordem: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type ChecklistExecucaoRow = {
  id: bigint;
  modelo_id: bigint | null;
  modelo_item_id: bigint | null;
  usuario_id: bigint;
  usuario_nome: string | null;
  unidade_id: bigint | null;
  unidade_nome: string | null;
  setor: string | null;
  cargo: string | null;
  referencia_data: Date;
  semana_inicio: Date;
  dia_semana: number;
  titulo_atividade: string;
  descricao_detalhada: string | null;
  horario_previsto: Date | string | null;
  prioridade: ChecklistPrioridade;
  alerta_ativo: boolean;
  horario_alerta: Date | string | null;
  observacao_obrigatoria: boolean;
  atividade_critica: boolean;
  status: ChecklistExecucaoStatus;
  observacao_usuario: string | null;
  concluido_em: Date | null;
  concluido_por_usuario_id: bigint | null;
  concluido_por_nome: string | null;
  dispensado_em: Date | null;
  dispensado_por_usuario_id: bigint | null;
  dispensado_por_nome: string | null;
  motivo_dispensa: string | null;
  nao_aplicavel_motivo: string | null;
  ativo: boolean;
  gerado_automaticamente: boolean;
  origem: string;
  criado_em: Date;
  atualizado_em: Date;
  modelo_nome: string | null;
  modelo_tipo: ChecklistModeloTipo | null;
};

export type ChecklistHistoricoRow = {
  id: bigint;
  referencia_tipo: ChecklistHistoricoReferenciaTipo;
  execucao_id: bigint | null;
  modelo_id: bigint | null;
  modelo_item_id: bigint | null;
  configuracao_id: bigint | null;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  usuario_responsavel_id: bigint | null;
  usuario_responsavel_nome: string | null;
  observacao: string | null;
  motivo: string | null;
  origem: string | null;
  dados_json: unknown;
  criado_em: Date;
};

export type ChecklistConfiguracaoRow = {
  id: bigint;
  sabado_ativo: boolean;
  domingo_ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type ChecklistIndicadoresRow = {
  total: bigint | number | null;
  concluidas: bigint | number | null;
  pendentes: bigint | number | null;
  atrasadas: bigint | number | null;
  dispensadas: bigint | number | null;
  nao_aplicaveis: bigint | number | null;
  criticas_nao_concluidas: bigint | number | null;
};
