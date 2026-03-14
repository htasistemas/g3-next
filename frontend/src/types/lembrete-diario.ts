export type LembreteDiario = {
  id: number;
  titulo: string;
  descricao?: string;
  dataInicial: string;
  usuarioId?: number | null;
  todosUsuarios?: boolean;
  recorrencia: string;
  horaAviso?: string | null;
  status: "PENDENTE" | "CONCLUIDO";
  proximaExecucaoEm?: string;
  adiadoAte?: string;
  concluidoEm?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type LembreteDiarioPayload = {
  titulo: string;
  descricao?: string;
  dataInicial: string;
  usuarioId?: number | null;
  todosUsuarios?: boolean;
  horaAviso?: string | null;
};

export type LembreteDiarioResumo = {
  totalPendentes: number;
  totalVencidos: number;
};
