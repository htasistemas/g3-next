export type StatusPrestacaoContas = "concluido" | "andamento" | "pendente";
export type StatusWorkflowPrestacao = "RASCUNHO" | "EM_ANALISE" | "EM_DILIGENCIA" | "APROVADA" | "APROVADA_RESSALVAS" | "REJEITADA" | "ENCERRADA";
export type TipoPrestacao = "PARCIAL" | "ANUAL" | "FINAL";

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
  arquivoId?: string;
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

export type PrestacaoDespesa = {
  id?: string;
  descricao: string;
  fornecedor?: string;
  documentoFiscal?: string;
  dataPagamento?: string;
  categoria?: string;
  valor?: number;
  status?: string;
};

export type PrestacaoParecerHistorico = {
  id: string;
  versao: number;
  conclusao?: string;
  parecerTexto?: string;
  ressalvas?: string;
  recomendacoes?: string;
  responsavel?: string;
  dataParecer?: string;
  usuarioNome?: string;
  criadoEm: string;
};

export type PrestacaoContasPayload = {
  id?: string;
  unidadeId?: string;
  instrumento?: string;
  objeto?: string;
  periodoInicio?: string;
  periodoFim?: string;
  tipoPrestacao?: TipoPrestacao;
  statusWorkflow?: StatusWorkflowPrestacao;
  totalRecebido?: number;
  totalRecebidoHelper?: string;
  totalAplicado?: number;
  totalAplicadoHelper?: string;
  saldoDisponivel?: number;
  saldoDisponivelHelper?: string;
  prestadoMes?: number;
  prestadoMesHelper?: string;
  parecerConclusao?: "APROVAR" | "APROVAR_RESSALVAS" | "REJEITAR";
  parecerTexto?: string;
  parecerRessalvas?: string;
  parecerRecomendacoes?: string;
  parecerResponsavel?: string;
  parecerData?: string;
  recebimentos: PrestacaoRecebimento[];
  destinacoes: PrestacaoDestinacao[];
  comprovantes: PrestacaoComprovante[];
  timelines: PrestacaoTimeline[];
  checklist: PrestacaoChecklist[];
  despesas: PrestacaoDespesa[];
  parecerHistorico: PrestacaoParecerHistorico[];
};

export type PrestacaoContas = PrestacaoContasPayload & {
  id: string;
};

export type PrestacaoProfissionalEntidade =
  | "concedentes"
  | "instrumentos"
  | "modelos"
  | "metas"
  | "rubricas"
  | "receitas"
  | "despesas"
  | "documentos"
  | "conciliacoes"
  | "diligencias"
  | "aprovacoes"
  | "transparencia";

export type PrestacaoProfissionalRegistro = Record<string, any> & {
  id?: string;
  razaoSocial?: string;
  nome?: string;
  objeto?: string;
  descricao?: string;
  situacao?: string;
};

export type PrestacaoProfissionalVisaoGeral = {
  valorGlobal: number;
  valorPrevisto: number;
  valorRecebido: number;
  valorExecutado: number;
  saldoDisponivel: number;
  percentualFinanceiroExecutado: number;
  parcerias: number;
  vigenciasVencendo: number;
  metasConcluidas: number;
  metasEmAndamento: number;
  metasAtrasadas: number;
  documentosPendentes: number;
  documentosVencidos: number;
  despesasPendentes: number;
  despesasInconsistentes: number;
  conciliacoesPendentes: number;
  diligenciasAbertas: number;
  diligenciasVencidas: number;
  aprovacoesPendentes: number;
  prestacoesAprovadas: number;
  aprovadasComRessalvas: number;
  rejeitadas: number;
};

export type PrestacaoIaConfig = {
  id?: string;
  tipo: "IA" | "OCR";
  provedor?: string | null;
  urlApi?: string | null;
  modelo?: string | null;
  ambiente?: string | null;
  limiteUso?: number | null;
  timeoutMs?: number | null;
  ativo?: boolean;
  credencialMascarada?: string | null;
  ultimoTesteEm?: string | null;
  ultimoSucessoEm?: string | null;
  ultimoErro?: string | null;
  observacoes?: string | null;
};
