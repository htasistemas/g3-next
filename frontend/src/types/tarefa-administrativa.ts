export type ChecklistItem = {
  id: string;
  titulo: string;
  concluido: boolean;
  concluidoEm?: string;
  ordem?: number;
};

export type TarefaHistorico = {
  id: string;
  mensagem: string;
  data: string;
};

export type TarefaAdministrativa = {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: "Alta" | "Media" | "Baixa";
  prazo?: string;
  status: "Aberta" | "Em andamento" | "Concluida" | "Em atraso";
  checklist: ChecklistItem[];
  historico: TarefaHistorico[];
  criadoEm: string;
  atualizadoEm?: string;
};

export type TarefaAdministrativaPayload = {
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: string;
  prazo?: string;
  status: string;
  checklist?: Array<{
    id?: number;
    titulo: string;
    concluido: boolean;
    concluidoEm?: string;
    ordem?: number;
  }>;
};
