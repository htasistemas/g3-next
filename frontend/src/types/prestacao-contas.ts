export type StatusPrestacaoContas = "concluido" | "andamento" | "pendente";

export type PrestacaoRecebimento = {
  id?: string;
  fonte: string;
  valor?: number;
  periodicidade?: string;
  status?: string;
};

export type PrestacaoDestinacao = {
  id?: string;
  titulo: string;
  descricao?: string;
  percentual?: number;
};

export type PrestacaoComprovante = {
  id?: string;
  titulo: string;
  descricao?: string;
  arquivoNome?: string;
  arquivoUrl?: string;
};

export type PrestacaoTimeline = {
  id?: string;
  titulo: string;
  detalhe?: string;
  status?: StatusPrestacaoContas | string;
};

export type PrestacaoChecklist = {
  id?: string;
  titulo: string;
  descricao?: string;
  status?: StatusPrestacaoContas | string;
};

export type PrestacaoContasPayload = {
  id?: string;
  unidadeId?: string;
  totalRecebido?: number;
  totalRecebidoHelper?: string;
  totalAplicado?: number;
  totalAplicadoHelper?: string;
  saldoDisponivel?: number;
  saldoDisponivelHelper?: string;
  prestadoMes?: number;
  prestadoMesHelper?: string;
  recebimentos: PrestacaoRecebimento[];
  destinacoes: PrestacaoDestinacao[];
  comprovantes: PrestacaoComprovante[];
  timelines: PrestacaoTimeline[];
  checklist: PrestacaoChecklist[];
};

export type PrestacaoContas = PrestacaoContasPayload & {
  id: string;
};
