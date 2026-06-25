export type PatrimonioInput = {
  numeroPatrimonio: string;
  nome: string;
  categoria?: string;
  subcategoria?: string;
  conservacao?: string;
  status?: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  origem?: string;
  responsavel?: string;
  unidade?: string;
  sala?: string;
  taxaDepreciacao?: number;
  observacoes?: string;
};

export type PatrimonioCategoriaInput = {
  nome: string;
  taxaDepreciacao?: number;
  subcategorias?: string[];
  ativo?: boolean;
};

export type PatrimonioCategoriaRow = {
  id: bigint;
  tenant_id: string;
  nome: string;
  taxa_depreciacao: number | null;
  subcategorias: unknown;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type PatrimonioMovimentoInput = {
  tipo: "MOVIMENTACAO" | "MANUTENCAO" | "BAIXA";
  destino?: string;
  responsavel?: string;
  observacao?: string;
  dataMovimento?: string;
};

export type PatrimonioRow = {
  id: bigint;
  numero_patrimonio: string;
  nome: string;
  categoria: string | null;
  subcategoria: string | null;
  conservacao: string | null;
  status: string | null;
  data_aquisicao: Date | null;
  valor_aquisicao: number | null;
  origem: string | null;
  responsavel: string | null;
  unidade: string | null;
  sala: string | null;
  taxa_depreciacao: number | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type PatrimonioMovimentoRow = {
  id: bigint;
  patrimonio_id: bigint;
  tipo: "MOVIMENTACAO" | "MANUTENCAO" | "BAIXA";
  destino: string | null;
  responsavel: string | null;
  observacao: string | null;
  data_movimento: Date;
};
