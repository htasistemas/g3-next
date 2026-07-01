export const voluntarioEscalaStatusValues = ["ATIVA", "PAUSADA", "INATIVA"] as const;
export const voluntarioEscalaDiaValues = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO"
] as const;

export type VoluntarioEscalaStatus = (typeof voluntarioEscalaStatusValues)[number];
export type VoluntarioEscalaDia = (typeof voluntarioEscalaDiaValues)[number];

export type VoluntarioEscalaInput = {
  voluntario_id: bigint;
  sala_id: bigint;
  atividade_tipo: string;
  titulo?: string;
  dias_semana: VoluntarioEscalaDia[];
  hora_inicio: string;
  hora_fim: string;
  carga_horaria_semanal?: number;
  status: VoluntarioEscalaStatus;
  observacoes?: string;
};

export type VoluntarioEscalaResumo = {
  id_escala: string;
  voluntario_id: string;
  voluntario_nome?: string;
  sala_id: string;
  sala_nome: string;
  unidade_nome?: string;
  atividade_tipo: string;
  titulo?: string;
  dias_semana: VoluntarioEscalaDia[];
  hora_inicio: string;
  hora_fim: string;
  carga_horaria_semanal: number;
  status: VoluntarioEscalaStatus;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
};
