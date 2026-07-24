export type HorarioDisponivel = {
  horarioInicial: string;
  horarioFinal: string;
};

function minutosDoHorario(valor: string) {
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

export function gerarHorariosDisponiveis(horarioInicial: string, horarioFinal: string, duracaoMinutos: number): HorarioDisponivel[] {
  const inicio = minutosDoHorario(horarioInicial);
  const fim = minutosDoHorario(horarioFinal);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || duracaoMinutos <= 0 || fim <= inicio) return [];
  const horarios: HorarioDisponivel[] = [];
  for (let atual = inicio; atual + duracaoMinutos <= fim; atual += duracaoMinutos) {
    const formatar = (valor: number) => `${String(Math.floor(valor / 60)).padStart(2, "0")}:${String(valor % 60).padStart(2, "0")}`;
    horarios.push({ horarioInicial: formatar(atual), horarioFinal: formatar(atual + duracaoMinutos) });
  }
  return horarios;
}
