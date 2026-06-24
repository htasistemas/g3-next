function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateOnlyLocal(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}

export function parseDateTimeLocal(value?: string | null) {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? "0"),
      0
    );
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateLocal(value?: Date | null) {
  if (!value) return null;
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function formatDateTimeLocal(value?: Date | null) {
  if (!value) return null;
  return `${formatDateLocal(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function inicioDoDiaLocal(value: Date) {
  const data = new Date(value);
  data.setHours(0, 0, 0, 0);
  return data;
}

export function adicionarDiasLocal(value: Date, dias: number) {
  const data = new Date(value);
  data.setDate(data.getDate() + dias);
  return data;
}

export function isFimDeSemana(value: Date) {
  const diaSemana = value.getDay();
  return diaSemana === 0 || diaSemana === 6;
}

export function calcularDiaRetiradaApoio(inicioEvento: Date) {
  return adicionarDiasLocal(inicioDoDiaLocal(inicioEvento), -1);
}

export function calcularDiaDevolucaoApoio(
  fimEvento: Date,
  feriados = new Set<string>()
) {
  let data = adicionarDiasLocal(inicioDoDiaLocal(fimEvento), 1);
  while (isFimDeSemana(data) || feriados.has(formatDateLocal(data) ?? "")) {
    data = adicionarDiasLocal(data, 1);
  }
  return data;
}
