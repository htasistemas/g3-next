export type ContaBancariaInput = {
  banco: string;
  agencia?: string | null;
  numero: string;
  tipo: string;
  projetoVinculado?: string | null;
  pixVinculado?: boolean;
  tipoChavePix?: string | null;
  chavePix?: string | null;
  recebimentoLocal?: boolean;
  saldo: number;
  dataAtualizacao: string;
};

export type LancamentoFinanceiroInput = {
  tipo: string;
  descricao: string;
  contraparte: string;
  vencimento: string;
  valor: number;
  situacao: string;
  compraId?: number | null;
};

export type MovimentacaoFinanceiraInput = {
  tipo: string;
  descricao: string;
  contraparte?: string | null;
  categoria?: string | null;
  contaBancariaId?: number | null;
  dataMovimentacao: string;
  valor: number;
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
  tipo: string;
  projeto_vinculado: string | null;
  pix_vinculado: boolean;
  tipo_chave_pix: string | null;
  chave_pix: string | null;
  recebimento_local: boolean;
  saldo: number;
  data_atualizacao: Date;
};

export type LancamentoFinanceiroRow = {
  id: bigint;
  tipo: string;
  descricao: string;
  contraparte: string;
  vencimento: Date;
  valor: number;
  situacao: string;
  compra_id: bigint | null;
};

export type MovimentacaoFinanceiraRow = {
  id: bigint;
  tipo: string;
  descricao: string;
  contraparte: string | null;
  categoria: string | null;
  conta_bancaria_id: bigint | null;
  data_movimentacao: Date;
  valor: number;
  conta_bancaria_numero: string | null;
  conta_bancaria_banco: string | null;
};

export type EmendaImpositivaRow = {
  id: bigint;
  identificacao: string;
  referencia_legal: string | null;
  data_prevista: Date;
  valor_previsto: number;
  dias_alerta: number;
  status: string;
  observacoes: string | null;
};
