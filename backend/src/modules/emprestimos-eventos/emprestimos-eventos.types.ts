export type StatusEmprestimoEvento =
  | "RASCUNHO"
  | "AGENDADO"
  | "RETIRADO"
  | "DEVOLVIDO"
  | "CANCELADO";

export type TipoItemEmprestimo = "PATRIMONIO" | "ALMOXARIFADO";

export type EventoEmprestimoInput = {
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  dataInicio: string;
  dataFim: string;
  status?: string | null;
};

export type EmprestimoEventoItemInput = {
  itemId: number;
  tipoItem: TipoItemEmprestimo;
  quantidade: number;
  statusItem?: string;
  observacaoItem?: string | null;
};

export type ResponsavelEmprestimoInput = {
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
};

export type EmprestimoEventoInput = {
  eventoId: number;
  unidadeId?: number | null;
  responsavelId?: number | null;
  responsavelNome?: string | null;
  dataRetiradaPrevista: string;
  dataDevolucaoPrevista: string;
  dataRetiradaReal?: string | null;
  dataDevolucaoReal?: string | null;
  status: StatusEmprestimoEvento;
  observacoes?: string | null;
  itens?: EmprestimoEventoItemInput[];
};

export type EmprestimoEventoFiltros = {
  inicio?: string;
  fim?: string;
  status?: string;
  evento?: string;
  item?: string;
  unidade?: string;
};

export type EventoEmprestimoRow = {
  id: bigint;
  titulo: string;
  descricao: string | null;
  local: string | null;
  data_inicio: Date;
  data_fim: Date;
  status: string;
};

export type ResponsavelEmprestimoRow = {
  id: bigint;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type EmprestimoEventoRow = {
  id: bigint;
  evento_id: bigint;
  unidade_id: bigint | null;
  responsavel_id: bigint | null;
  responsavel_nome_livre: string | null;
  data_retirada_prevista: Date;
  data_devolucao_prevista: Date;
  data_retirada_real: Date | null;
  data_devolucao_real: Date | null;
  status: string;
  observacoes: string | null;
  evento_titulo: string;
  evento_descricao: string | null;
  evento_local: string | null;
  evento_data_inicio: Date;
  evento_data_fim: Date;
  evento_status: string;
  responsavel_nome: string | null;
};

export type EmprestimoEventoItemRow = {
  id: bigint;
  emprestimo_id: bigint;
  item_id: bigint;
  tipo_item: TipoItemEmprestimo;
  quantidade: number;
  status_item: string;
  observacao_item: string | null;
  nome_item: string | null;
  numero_patrimonio: string | null;
};

export type EmprestimoEventoMovimentacaoRow = {
  id: bigint;
  emprestimo_id: bigint;
  acao: string;
  descricao: string | null;
  usuario_id: bigint | null;
  criado_em: Date;
};
