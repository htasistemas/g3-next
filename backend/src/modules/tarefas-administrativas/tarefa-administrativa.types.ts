export type TarefaChecklistInput = {
  id?: number;
  titulo: string;
  concluido?: boolean;
  concluidoEm?: string;
  ordem?: number;
};

export type TarefaAdministrativaInput = {
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: string;
  prazo?: string;
  status: string;
  checklist?: TarefaChecklistInput[];
};

export type TarefaAdministrativaHistoricoInput = {
  mensagem: string;
};

export type TarefaAdministrativaChecklistRow = {
  id: bigint;
  tarefa_id: bigint;
  titulo: string;
  concluido: boolean;
  concluido_em: Date | null;
  ordem: number;
};

export type TarefaAdministrativaHistoricoRow = {
  id: bigint;
  tarefa_id: bigint;
  mensagem: string;
  criado_em: Date;
};

export type TarefaAdministrativaRow = {
  id: bigint;
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: string;
  prazo: Date | null;
  status: string;
  criado_em: Date;
  atualizado_em: Date;
};
