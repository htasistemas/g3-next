export type ContaBancariaTipo =
  | 'CONTA_CORRENTE'
  | 'POUPANCA'
  | 'APLICACAO'
  | 'CAIXA_INTERNO';

export type StatusAtivoInativo = 'ATIVA' | 'INATIVA';

export type CategoriaFinanceiraTipo = 'RECEITA' | 'DESPESA';

export type LancamentoFinanceiroTipo =
  | 'RECEITA'
  | 'DESPESA'
  | 'TRANSFERENCIA'
  | 'AJUSTE'
  | 'ESTORNO';

export type LancamentoFinanceiroStatus =
  | 'PREVISTO'
  | 'PENDENTE'
  | 'PAGO'
  | 'RECEBIDO'
  | 'VENCIDO'
  | 'ATRASADO'
  | 'CANCELADO'
  | 'CONCILIADO'
  | 'ESTORNADO'
  | 'AGUARDANDO_PAGAMENTO'
  | 'AGUARDANDO_RECEBIMENTO'
  | 'RENEGOCIADO';

export type TransferenciaFinanceiraStatus =
  | 'PENDENTE'
  | 'CONCLUIDA'
  | 'ESTORNADA'
  | 'CANCELADA';

export type ConciliacaoFinanceiraSituacao = 'PENDENTE' | 'CONCILIADO' | 'DIVERGENTE';

export type ContaBancariaPayload = {
  banco: string;
  agencia?: string;
  numero: string;
  digito?: string;
  nomeConta: string;
  tipo: ContaBancariaTipo;
  titular?: string;
  projetoVinculado?: string;
  pixVinculado?: boolean;
  tipoChavePix?: string;
  chavePix?: string;
  recebimentoLocal?: boolean;
  saldoInicial: number;
  dataSaldoInicial: string;
  limiteMinimoAlerta?: number;
  status?: StatusAtivoInativo;
  permiteMovimentacao?: boolean;
  observacao?: string;
};

export type ContaBancaria = ContaBancariaPayload & {
  id: number;
  saldoAtual: number;
  dataAtualizacao: string;
};

export type CategoriaFinanceiraPayload = {
  codigo: string;
  nome: string;
  tipo: CategoriaFinanceiraTipo;
  grupo?: string;
  subgrupo?: string;
  categoriaPaiId?: number;
  aceitaLancamentoDireto?: boolean;
  status?: StatusAtivoInativo;
  observacao?: string;
};

export type CategoriaFinanceira = CategoriaFinanceiraPayload & {
  id: number;
};

export type CentroCustoPayload = {
  codigo: string;
  nome: string;
  setorResponsavel: string;
  descricao?: string;
  status?: StatusAtivoInativo;
};

export type CentroCusto = CentroCustoPayload & {
  id: number;
};

export type LancamentoFinanceiroPayload = {
  dataLancamento: string;
  tipo: LancamentoFinanceiroTipo;
  natureza: string;
  contaBancariaId?: number;
  categoriaId?: number;
  centroCustoId?: number;
  setor?: string;
  contraparte: string;
  documento?: string;
  historico: string;
  valor: number;
  formaPagamento?: string;
  status: LancamentoFinanceiroStatus;
  origem?: string;
  observacao?: string;
  vencimento: string;
  dataBaixa?: string;
  responsavel?: string;
  projeto?: string;
  compraId?: number;
};

export type LancamentoFinanceiro = LancamentoFinanceiroPayload & {
  id: number;
  descricao: string;
  conciliado: boolean;
  bloqueadoOrigem: boolean;
  contaBancariaNome?: string;
  categoriaNome?: string;
  centroCustoNome?: string;
};

export type LancamentoFinanceiroBaixaPayload = {
  responsavel?: string;
  data?: string;
  contaBancariaId?: number;
  formaPagamento?: string;
  observacao?: string;
};

export type ReciboPagamento = {
  numeroRecibo?: string;
  dataPagamento?: string;
  valorTotal?: number;
  compraId?: number;
  descricao?: string;
  responsavel?: string;
};

export type MovimentacaoFinanceiraPayload = {
  tipo: string;
  descricao: string;
  contraparte?: string;
  categoria?: string;
  contaBancariaId?: number;
  dataMovimentacao: string;
  valor: number;
  origem?: string;
  observacao?: string;
};

export type MovimentacaoFinanceira = MovimentacaoFinanceiraPayload & {
  id: number;
  categoriaId?: number;
  centroCustoId?: number;
  saldoAnterior?: number;
  saldoAtual?: number;
  lancamentoFinanceiroId?: number;
  transferenciaId?: number;
  contaBancariaNumero?: string;
  contaBancariaBanco?: string;
  contaBancariaNome?: string;
  categoriaNome?: string;
  centroCustoNome?: string;
};

export type TransferenciaFinanceiraPayload = {
  contaOrigemId: number;
  contaDestinoId: number;
  dataTransferencia: string;
  valor: number;
  descricao: string;
  responsavel: string;
  observacao?: string;
};

export type TransferenciaFinanceira = TransferenciaFinanceiraPayload & {
  id: number;
  status: TransferenciaFinanceiraStatus;
  movimentacaoSaidaId?: number;
  movimentacaoEntradaId?: number;
  contaOrigemNome?: string;
  contaDestinoNome?: string;
};

export type ConciliacaoFinanceiraPayload = {
  contaBancariaId: number;
  dataMovimento: string;
  descricaoExtrato: string;
  valorExtrato: number;
  lancamentoFinanceiroId?: number;
  movimentacaoFinanceiraId?: number;
  situacao?: ConciliacaoFinanceiraSituacao;
  observacao?: string;
};

export type ConciliacaoFinanceira = ConciliacaoFinanceiraPayload & {
  id: number;
  diferenca: number;
  contaBancariaNome?: string;
  lancamentoDescricao?: string;
  movimentacaoDescricao?: string;
};

export type CompraIntegradaFinanceira = {
  compraId: number;
  numeroCompra?: string;
  fornecedor?: string;
  valorAprovado: number;
  valorReservado: number;
  valorAutorizado: number;
  contaBancariaId?: number;
  contaNome?: string;
  dataPrevistaPagamento?: string;
  statusCompra?: string;
  statusFinanceiro?: string;
  lancamentoFinanceiroId?: number;
};

export type HistoricoContabilidade = {
  id: number;
  aba: string;
  acao: string;
  tipoRegistro: string;
  registroId?: string;
  valor?: number;
  conta?: string;
  statusAnterior?: string;
  statusNovo?: string;
  observacao?: string;
  origem?: string;
  usuarioId?: number;
  usuarioNome?: string;
  perfil?: string;
  ip?: string;
  maquina?: string;
  dataHora: string;
};

export type EmendaImpositivaPayload = {
  identificacao: string;
  referenciaLegal?: string;
  dataPrevista: string;
  valorPrevisto: number;
  diasAlerta: number;
  status: string;
  observacoes?: string;
};

export type EmendaImpositiva = EmendaImpositivaPayload & {
  id: number;
};
