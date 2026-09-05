export type ProjetoIndicadorTipo = "PROCESSO" | "PRODUTO" | "RESULTADO" | "IMPACTO";
export type ProjetoIndicadorPeriodicidade = "UNICA" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

export type ProjetoIndicadorInput = {
  nome: string;
  descricao?: string;
  tipo: ProjetoIndicadorTipo;
  unidade_medida: string;
  linha_base?: number;
  meta: number;
  valor_atual?: number;
  periodicidade: ProjetoIndicadorPeriodicidade;
  fonte_dado?: string;
  responsavel?: string;
  status?: "ATIVO" | "INATIVO";
};

export type ProjetoIndicadorRow = {
  id: bigint;
  tenant_id: string;
  projeto_id: bigint;
  nome: string;
  descricao: string | null;
  tipo: ProjetoIndicadorTipo;
  unidade_medida: string;
  linha_base: string | number | null;
  meta: string | number;
  valor_atual: string | number;
  periodicidade: ProjetoIndicadorPeriodicidade;
  fonte_dado: string | null;
  responsavel: string | null;
  status: "ATIVO" | "INATIVO";
  criado_em: Date;
  atualizado_em: Date;
};

export type ProjetoIndicadorMedicaoRow = {
  id: bigint;
  indicador_id: bigint;
  competencia: Date;
  valor: string | number;
  observacao: string | null;
  registrado_em: Date;
};
