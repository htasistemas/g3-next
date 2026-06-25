export type PatrimonioMovimento = {
  idMovimento?: string;
  tipo: "MOVIMENTACAO" | "MANUTENCAO" | "BAIXA";
  destino?: string;
  responsavel?: string;
  observacao?: string;
  dataMovimento?: string;
};

export type Patrimonio = {
  idPatrimonio?: string;
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
  movimentos?: PatrimonioMovimento[];
};

export type PatrimonioCategoria = {
  id?: string;
  nome: string;
  taxaDepreciacao?: number;
  subcategorias?: string[];
  ativo?: boolean;
};
