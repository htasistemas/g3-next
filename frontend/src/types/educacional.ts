export type EducacionalItem = Record<string, unknown> & { id: string };

export type EducacionalResumo = {
  alunosAtivos: number;
  matriculasAtivas: number;
  turmasAtivas: number;
  professores: number;
  anosLetivos: number;
};

export type BeneficiarioBusca = {
  id: string;
  codigo: string | null;
  nome: string;
  dataNascimento: string | null;
  nomeMae: string | null;
};
