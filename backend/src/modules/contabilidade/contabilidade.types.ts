export type ContaBancariaTipo =
  | "CONTA_CORRENTE"
  | "POUPANCA"
  | "APLICACAO"
  | "CAIXA_INTERNO";

export type ContaBancariaStatus = "ATIVA" | "INATIVA";

export type CategoriaFinanceiraTipo = "RECEITA" | "DESPESA";

export type LancamentoFinanceiroTipo =
  | "RECEITA"
  | "DESPESA"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "ESTORNO";

export type LancamentoFinanceiroStatus =
  | "PREVISTO"
  | "PENDENTE"
  | "PAGO"
  | "RECEBIDO"
  | "VENCIDO"
  | "ATRASADO"
  | "CANCELADO"
  | "CONCILIADO"
  | "ESTORNADO"
  | "AGUARDANDO_PAGAMENTO"
  | "AGUARDANDO_RECEBIMENTO"
  | "RENEGOCIADO";

export type TransferenciaFinanceiraStatus =
  | "PENDENTE"
  | "CONCLUIDA"
  | "ESTORNADA"
  | "CANCELADA";

export type ConciliacaoFinanceiraSituacao = "PENDENTE" | "CONCILIADO" | "DIVERGENTE";

export type ContabilidadeAtor = {
  usuarioId?: bigint;
  nomeUsuario?: string;
  permissoes?: string[];
  ip?: string | null;
  maquina?: string | null;
};

export type ContaBancariaInput = {
  banco: string;
  agencia?: string | null;
  numero: string;
  digito?: string | null;
  nomeConta: string;
  tipo: ContaBancariaTipo;
  titular?: string | null;
  projetoVinculado?: string | null;
  pixVinculado?: boolean;
  tipoChavePix?: string | null;
  chavePix?: string | null;
  recebimentoLocal?: boolean;
  saldoInicial: number;
  dataSaldoInicial: string;
  limiteMinimoAlerta?: number | null;
  status?: ContaBancariaStatus;
  permiteMovimentacao?: boolean;
  observacao?: string | null;
};

export type CategoriaFinanceiraInput = {
  codigo: string;
  nome: string;
  tipo: CategoriaFinanceiraTipo;
  grupo?: string | null;
  subgrupo?: string | null;
  categoriaPaiId?: number | null;
  aceitaLancamentoDireto?: boolean;
  status?: ContaBancariaStatus;
  observacao?: string | null;
};

export type CentroCustoInput = {
  codigo: string;
  nome: string;
  setorResponsavel: string;
  descricao?: string | null;
  status?: ContaBancariaStatus;
};

export type LancamentoFinanceiroInput = {
  dataLancamento: string;
  tipo: LancamentoFinanceiroTipo;
  natureza: string;
  contaBancariaId?: number | null;
  categoriaId?: number | null;
  centroCustoId?: number | null;
  setor?: string | null;
  contraparte: string;
  documento?: string | null;
  historico: string;
  valor: number;
  formaPagamento?: string | null;
  status: LancamentoFinanceiroStatus;
  origem?: string | null;
  observacao?: string | null;
  vencimento: string;
  dataBaixa?: string | null;
  responsavel?: string | null;
  compraId?: number | null;
  projeto?: string | null;
};

export type LancamentoFinanceiroBaixaInput = {
  responsavel?: string | null;
  data?: string | null;
  contaBancariaId?: number | null;
  formaPagamento?: string | null;
  observacao?: string | null;
};

export type MovimentacaoFinanceiraInput = {
  tipo: string;
  descricao: string;
  contraparte?: string | null;
  categoria?: string | null;
  contaBancariaId?: number | null;
  centroCustoId?: number | null;
  dataMovimentacao: string;
  valor: number;
  origem?: string | null;
  observacao?: string | null;
};

export type TransferenciaFinanceiraInput = {
  contaOrigemId: number;
  contaDestinoId: number;
  dataTransferencia: string;
  valor: number;
  descricao: string;
  responsavel: string;
  observacao?: string | null;
};

export type ConciliacaoFinanceiraInput = {
  contaBancariaId: number;
  dataMovimento: string;
  descricaoExtrato: string;
  valorExtrato: number;
  lancamentoFinanceiroId?: number | null;
  movimentacaoFinanceiraId?: number | null;
  situacao?: ConciliacaoFinanceiraSituacao;
  observacao?: string | null;
};

export type EmendaImpositivaInput = {
  identificacao: string;
  referenciaLegal?: string | null;
  dataPrevista: string;
  valorPrevisto: number;
  diasAlerta: number;
  status: string;
  observacoes?: string | null;
};

export type ContaBancariaRow = {
  id: bigint;
  banco: string;
  agencia: string | null;
  numero: string;
  digito: string | null;
  nome_conta: string | null;
  tipo: string;
  titular: string | null;
  projeto_vinculado: string | null;
  pix_vinculado: boolean;
  tipo_chave_pix: string | null;
  chave_pix: string | null;
  recebimento_local: boolean;
  saldo: number;
  saldo_inicial: number | null;
  data_saldo_inicial: Date | null;
  limite_minimo_alerta: number | null;
  status: string | null;
  permite_movimentacao: boolean;
  observacao: string | null;
  data_atualizacao: Date | null;
  ativo: boolean;
};

export type CategoriaFinanceiraRow = {
  id: bigint;
  codigo: string;
  nome: string;
  tipo: string;
  grupo: string | null;
  subgrupo: string | null;
  categoria_pai_id: bigint | null;
  aceita_lancamento_direto: boolean;
  status: string;
  observacao: string | null;
  ativo: boolean;
};

export type CentroCustoRow = {
  id: bigint;
  codigo: string;
  nome: string;
  setor_responsavel: string;
  descricao: string | null;
  status: string;
  ativo: boolean;
};

export type LancamentoFinanceiroRow = {
  id: bigint;
  data_lancamento: Date | null;
  tipo: string;
  natureza: string | null;
  conta_bancaria_id: bigint | null;
  categoria_financeira_id: bigint | null;
  centro_custo_id: bigint | null;
  setor: string | null;
  descricao: string;
  contraparte: string;
  documento: string | null;
  historico: string | null;
  vencimento: Date | null;
  valor: number;
  forma_pagamento: string | null;
  situacao: string;
  origem: string | null;
  observacao: string | null;
  data_baixa: Date | null;
  responsavel: string | null;
  projeto: string | null;
  compra_id: bigint | null;
  conciliado: boolean;
  bloqueado_origem: boolean;
  ativo: boolean;
  conta_bancaria_nome: string | null;
  categoria_nome: string | null;
  centro_custo_nome: string | null;
};

export type MovimentacaoFinanceiraRow = {
  id: bigint;
  tipo: string;
  descricao: string;
  contraparte: string | null;
  categoria: string | null;
  categoria_financeira_id: bigint | null;
  centro_custo_id: bigint | null;
  conta_bancaria_id: bigint | null;
  data_movimentacao: Date | null;
  valor: number;
  origem: string | null;
  observacao: string | null;
  saldo_anterior: number | null;
  saldo_atual: number | null;
  lancamento_financeiro_id: bigint | null;
  transferencia_id: bigint | null;
  conta_bancaria_numero: string | null;
  conta_bancaria_banco: string | null;
  conta_bancaria_nome: string | null;
  categoria_nome: string | null;
  centro_custo_nome: string | null;
};

export type TransferenciaFinanceiraRow = {
  id: bigint;
  conta_origem_id: bigint;
  conta_destino_id: bigint;
  data_transferencia: Date | null;
  valor: number;
  descricao: string;
  responsavel: string | null;
  observacao: string | null;
  status: string;
  movimentacao_saida_id: bigint | null;
  movimentacao_entrada_id: bigint | null;
  conta_origem_nome: string | null;
  conta_destino_nome: string | null;
};

export type ConciliacaoFinanceiraRow = {
  id: bigint;
  conta_bancaria_id: bigint;
  data_movimento: Date | null;
  descricao_extrato: string;
  valor_extrato: number;
  lancamento_financeiro_id: bigint | null;
  movimentacao_financeira_id: bigint | null;
  situacao: string;
  diferenca: number | null;
  observacao: string | null;
  conta_bancaria_nome: string | null;
  lancamento_descricao: string | null;
  movimentacao_descricao: string | null;
};

export type ContabilidadeHistoricoRow = {
  id: bigint;
  aba: string;
  acao: string;
  tipo_registro: string;
  registro_id: string | null;
  valor: number | null;
  conta: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  observacao: string | null;
  origem: string | null;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  perfil: string | null;
  ip: string | null;
  maquina: string | null;
  criado_em: Date;
};

export type CompraIntegracaoFinanceiraRow = {
  compra_id: bigint;
  numero_solicitacao: string | null;
  fornecedor: string | null;
  valor_aprovado: number | null;
  valor_reservado: number | null;
  valor_autorizado: number | null;
  conta_bancaria_id: bigint | null;
  conta_nome: string | null;
  data_prevista_pagamento: Date | null;
  status_compra: string | null;
  status_financeiro: string | null;
  lancamento_financeiro_id: bigint | null;
};

export type EmendaImpositivaRow = {
  id: bigint;
  identificacao: string;
  referencia_legal: string | null;
  data_prevista: Date | null;
  valor_previsto: number;
  dias_alerta: number;
  status: string;
  observacoes: string | null;
};

export type ReciboPagamentoRow = {
  numeroRecibo: string;
  dataPagamento: string;
  valorTotal: number;
  compraId?: number;
  descricao?: string;
  responsavel?: string;
};
