export type SituacaoVisita = "Agendada" | "Em andamento" | "Realizada" | "Cancelada";

export type VisitaDomiciliarInput = {
  beneficiarioId: number;
  unidade: string;
  responsavel: string;
  dataVisita: string;
  horarioInicial: string;
  horarioFinal?: string | null;
  tipoVisita?: string | null;
  situacao: SituacaoVisita;
  usarEnderecoBeneficiario: boolean;
  endereco?: Record<string, unknown>;
  observacoesIniciais?: string | null;
  condicoes?: Record<string, unknown>;
  situacaoSocial?: Record<string, unknown>;
  registro?: Record<string, unknown>;
  anexos?: Array<Record<string, unknown>>;
};

export type VisitaDomiciliarRow = {
  id: bigint;
  beneficiario_id: bigint;
  beneficiario_nome: string;
  unidade: string;
  responsavel: string;
  data_visita: Date;
  horario_inicial: string;
  horario_final: string | null;
  tipo_visita: string | null;
  situacao: string;
  usar_endereco_beneficiario: boolean;
  endereco: unknown;
  observacoes_iniciais: string | null;
  condicoes: unknown;
  situacao_social: unknown;
  registro: unknown;
  anexos: unknown;
  criado_em: Date;
  atualizado_em: Date;
};
