export type CompatibilidadeEnturmacao = {
  matricula: {
    ano_letivo_id: bigint;
    unidade_id: bigint;
    etapa_id: bigint;
    serie_id: bigint;
  };
  turma: {
    ano_letivo_id: bigint;
    unidade_id: bigint | null;
    etapa_id: bigint;
    serie_id: bigint;
  };
};

export function listarIncompatibilidadesEnturmacao({ matricula, turma }: CompatibilidadeEnturmacao): string[] {
  const incompatibilidades: string[] = [];
  if (turma.ano_letivo_id !== matricula.ano_letivo_id) incompatibilidades.push("ano letivo");
  if (turma.unidade_id !== null && turma.unidade_id !== matricula.unidade_id) incompatibilidades.push("unidade de ensino");
  if (turma.etapa_id !== matricula.etapa_id) incompatibilidades.push("etapa");
  if (turma.serie_id !== matricula.serie_id) incompatibilidades.push("série");
  return incompatibilidades;
}
