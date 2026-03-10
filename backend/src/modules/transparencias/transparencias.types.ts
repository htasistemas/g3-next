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

export type TransparenciaInput = {
  id?: string;
  unidadeId?: string | null;
  totalRecebido?: number | null;
  totalRecebidoHelper?: string | null;
  totalAplicado?: number | null;
  totalAplicadoHelper?: string | null;
  saldoDisponivel?: number | null;
  saldoDisponivelHelper?: string | null;
  prestadoMes?: number | null;
  prestadoMesHelper?: string | null;
  recebimentos: TransparenciaRecebimentoInput[];
  destinacoes: TransparenciaDestinacaoInput[];
  comprovantes: TransparenciaComprovanteInput[];
  timelines: TransparenciaTimelineInput[];
  checklist: TransparenciaChecklistInput[];
};

export type TransparenciaRow = {
  id: bigint;
  unidade_id: bigint | null;
  total_recebido: number | null;
  total_recebido_helper: string | null;
  total_aplicado: number | null;
  total_aplicado_helper: string | null;
  saldo_disponivel: number | null;
  saldo_disponivel_helper: string | null;
  prestado_mes: number | null;
  prestado_mes_helper: string | null;
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
