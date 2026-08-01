export type TransparenciaRecebimentoInput = {
  id?: string;
  fonte: string;
  valor?: number | null;
  periodicidade?: string | null;
  status?: string | null;
};

export type TransparenciaDestinacaoInput = {
  id?: string;
  titulo: string;
  descricao?: string | null;
  percentual?: number | null;
};

export type TransparenciaComprovanteInput = {
  id?: string;
  arquivoId?: string | null;
  titulo: string;
  descricao?: string | null;
  arquivoNome?: string | null;
  arquivoUrl?: string | null;
};

export type TransparenciaTimelineInput = {
  id?: string;
  titulo: string;
  detalhe?: string | null;
  status?: string | null;
};

export type TransparenciaChecklistInput = {
  id?: string;
  titulo: string;
  descricao?: string | null;
  status?: string | null;
};

export type TransparenciaDespesaInput = {
  id?: string;
  descricao: string;
  fornecedor?: string | null;
  documentoFiscal?: string | null;
  dataPagamento?: string | null;
  categoria?: string | null;
  valor?: number | null;
  status?: string | null;
};

export type TransparenciaInput = {
  id?: string;
  unidadeId?: string | null;
  instrumento?: string | null;
  objeto?: string | null;
  periodoInicio?: string | null;
  periodoFim?: string | null;
  tipoPrestacao?: TransparenciaTipoPrestacao | null;
  totalRecebido?: number | null;
  totalRecebidoHelper?: string | null;
  totalAplicado?: number | null;
  totalAplicadoHelper?: string | null;
  saldoDisponivel?: number | null;
  saldoDisponivelHelper?: string | null;
  prestadoMes?: number | null;
  prestadoMesHelper?: string | null;
  parecerConclusao?: "APROVAR" | "APROVAR_RESSALVAS" | "REJEITAR" | null;
  parecerTexto?: string | null;
  parecerRessalvas?: string | null;
  parecerRecomendacoes?: string | null;
  parecerResponsavel?: string | null;
  parecerData?: string | null;
  recebimentos: TransparenciaRecebimentoInput[];
  destinacoes: TransparenciaDestinacaoInput[];
  comprovantes: TransparenciaComprovanteInput[];
  timelines: TransparenciaTimelineInput[];
  checklist: TransparenciaChecklistInput[];
  despesas: TransparenciaDespesaInput[];
};

export type TransparenciaRow = {
  id: bigint;
  unidade_id: bigint | null;
  instrumento: string | null;
  objeto: string | null;
  periodo_inicio: Date | null;
  periodo_fim: Date | null;
  tipo_prestacao: string | null;
  status_workflow: string | null;
  criado_em: Date | null;
  atualizado_em: Date | null;
  total_recebido: number | null;
  total_recebido_helper: string | null;
  total_aplicado: number | null;
  total_aplicado_helper: string | null;
  saldo_disponivel: number | null;
  saldo_disponivel_helper: string | null;
  prestado_mes: number | null;
  prestado_mes_helper: string | null;
  parecer_conclusao: string | null;
  parecer_texto: string | null;
  parecer_ressalvas: string | null;
  parecer_recomendacoes: string | null;
  parecer_responsavel: string | null;
  parecer_data: Date | null;
};

export type TransparenciaRecebimentoRow = {
  id: bigint;
  transparencia_id: bigint;
  fonte: string;
  valor: number | null;
  periodicidade: string | null;
  status: string | null;
  ordem: number;
};

export type TransparenciaDestinacaoRow = {
  id: bigint;
  transparencia_id: bigint;
  titulo: string;
  descricao: string | null;
  percentual: number | null;
  ordem: number;
};

export type TransparenciaComprovanteRow = {
  id: bigint;
  arquivo_id?: bigint | null;
  transparencia_id: bigint;
  titulo: string;
  descricao: string | null;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  ordem: number;
};

export type TransparenciaTimelineRow = {
  id: bigint;
  transparencia_id: bigint;
  titulo: string;
  detalhe: string | null;
  status: string | null;
  ordem: number;
};

export type TransparenciaChecklistRow = {
  id: bigint;
  transparencia_id: bigint;
  titulo: string;
  descricao: string | null;
  status: string | null;
  ordem: number;
};

export type TransparenciaDespesaRow = {
  id: bigint;
  transparencia_id: bigint;
  descricao: string;
  fornecedor: string | null;
  documento_fiscal: string | null;
  data_pagamento: Date | null;
  categoria: string | null;
  valor: number | null;
  status: string | null;
  ordem: number;
};

export type TransparenciaParecerHistoricoRow = {
  id: bigint;
  transparencia_id: bigint;
  versao: number;
  conclusao: string | null;
  parecer_texto: string | null;
  ressalvas: string | null;
  recomendacoes: string | null;
  responsavel: string | null;
  data_parecer: Date | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  criado_em: Date;
};
export const transparenciaTipoPrestacaoValues = ["PARCIAL", "ANUAL", "FINAL"] as const;
export const transparenciaWorkflowStatusValues = [
  "RASCUNHO",
  "EM_ANALISE",
  "EM_DILIGENCIA",
  "APROVADA",
  "APROVADA_RESSALVAS",
  "REJEITADA",
  "ENCERRADA"
] as const;

export type TransparenciaTipoPrestacao = (typeof transparenciaTipoPrestacaoValues)[number];
export type TransparenciaWorkflowStatus = (typeof transparenciaWorkflowStatusValues)[number];
