export type ContaBancariaPayload = {
  banco: string;
  agencia?: string;
  numero: string;
  tipo: string;
  projetoVinculado?: string;
  pixVinculado?: boolean;
  tipoChavePix?: string;
  chavePix?: string;
  recebimentoLocal?: boolean;
  saldo: number;
  dataAtualizacao: string;
};

export type ContaBancaria = ContaBancariaPayload & {
  id: number;
};

export type LancamentoFinanceiroPayload = {
  tipo: string;
  descricao: string;
  contraparte: string;
  vencimento: string;
  valor: number;
  situacao: string;
  compraId?: number;
};

export type LancamentoFinanceiro = LancamentoFinanceiroPayload & {
  id: number;
};

export type ReciboPagamentoConta = {
  contaBancariaId?: number;
  banco?: string;
  numero?: string;
  valor?: number;
};

export type ReciboPagamento = {
  numeroRecibo?: string;
  dataPagamento?: string;
  valorTotal?: number;
  compraId?: number;
  descricao?: string;
  responsavel?: string;
  contas?: ReciboPagamentoConta[];
};

export type MovimentacaoFinanceiraPayload = {
  tipo: string;
  descricao: string;
  contraparte?: string;
  categoria?: string;
  contaBancariaId?: number;
  dataMovimentacao: string;
  valor: number;
};

export type MovimentacaoFinanceira = MovimentacaoFinanceiraPayload & {
  id: number;
  contaBancariaNumero?: string;
  contaBancariaBanco?: string;
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
