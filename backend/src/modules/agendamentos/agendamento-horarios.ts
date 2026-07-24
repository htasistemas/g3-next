import { AppError } from "../../shared/errors/app-error.js";

export type HorarioDisponivel = {
  horarioInicial: string;
  horarioFinal: string;
};

function minutosDoHorario(valor: string) {
  const match = valor.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) throw new AppError("Informe horários válidos para a agenda.", 400);
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas > 23 || minutos > 59) throw new AppError("Informe horários válidos para a agenda.", 400);
  return horas * 60 + minutos;
}

function formatarHorario(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function gerarHorariosDisponiveis(horarioInicial: string, horarioFinal: string, duracaoMinutos: number) {
  const inicio = minutosDoHorario(horarioInicial);
  const fim = minutosDoHorario(horarioFinal);
  if (!Number.isInteger(duracaoMinutos) || duracaoMinutos <= 0 || duracaoMinutos > 1440) {
    throw new AppError("A duração do atendimento deve ser maior que zero.", 400);
  }
  if (fim <= inicio) throw new AppError("O horário final deve ser posterior ao horário inicial.", 400);

  const horarios: HorarioDisponivel[] = [];
  for (let atual = inicio; atual + duracaoMinutos <= fim; atual += duracaoMinutos) {
    horarios.push({ horarioInicial: formatarHorario(atual), horarioFinal: formatarHorario(atual + duracaoMinutos) });
  }
  if (!horarios.length) throw new AppError("O período informado não comporta a duração escolhida.", 400);
  return horarios;
}
