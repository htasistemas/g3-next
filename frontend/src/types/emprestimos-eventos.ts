export type StatusEmprestimoEvento =
  | "RASCUNHO"
  | "AGENDADO"
  | "RETIRADO"
  | "DEVOLVIDO"
  | "CANCELADO";

export type TipoItemEmprestimo = "PATRIMONIO" | "ALMOXARIFADO";

export type EventoEmprestimo = {
  id: number;
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  dataInicio: string;
  dataFim: string;
  status: string;
};

export type ResponsavelEmprestimo = {
  id: number;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ItemEmprestimoEvento = {
  id?: number;
  itemId: number;
  tipoItem: TipoItemEmprestimo;
  quantidade: number;
  statusItem: string;
  observacaoItem?: string | null;
  nomeItem?: string | null;
  numeroPatrimonio?: string | null;
};

export type EmprestimoEvento = {
  id?: number;
  evento: EventoEmprestimo;
  unidadeId?: number | null;
  responsavel?: { id?: number | null; nome: string } | null;
  dataRetiradaPrevista: string;
  dataDevolucaoPrevista: string;
  dataRetiradaReal?: string | null;
  dataDevolucaoReal?: string | null;
  status: StatusEmprestimoEvento;
  observacoes?: string | null;
  itens?: ItemEmprestimoEvento[];
};

export type EmprestimoEventoPayload = {
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
  itens?: ItemEmprestimoEvento[];
};

export type ResponsavelEmprestimoPayload = {
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  observacoes?: string | null;
};

export type DisponibilidadeItemEmprestimo = {
  disponivel: boolean;
  quantidadeDisponivel?: number | null;
  conflitos?: Array<{
    emprestimoId: number;
    eventoTitulo: string;
    inicio: string;
    fim: string;
    status: string;
    quantidadeReservada?: number | null;
  }>;
};
