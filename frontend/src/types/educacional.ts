export type EducacionalItem = Record<string, unknown> & { id: string };

export type EducacionalResumo = {
  alunosAtivos: number;
  matriculasAtivas: number;
  turmasAtivas: number;
  professores: number;
  anosLetivos: number;
  alunos_ativos?: number;
  matriculas_ativas?: number;
  turmas_ativas?: number;
  frequencia_geral?: number;
  alunos_risco?: number;
  alunos_risco_critico?: number;
  risco_evasao?: number;
  ocorrencias_mes?: number;
  ocorrencias_recorrentes?: number;
  chamadas_pendentes?: number;
  media_geral?: number;
  documentos_pendentes?: number;
  turmas_sem_professor?: number;
  turmas_proximas_capacidade?: number;
  pendencias?: Array<{ chave: string; prioridade: string; descricao: string; total: number; destino: string }>;
  matriculas?: Record<string, number>;
};

export type BeneficiarioBusca = {
  id: string;
  codigo: string | null;
  nome: string;
  dataNascimento: string | null;
  nomeMae: string | null;
};
