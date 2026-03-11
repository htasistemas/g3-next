export function toLocalDateISO(date: Date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function startOfMonthLocalISO(date: Date = new Date()) {
  return toLocalDateISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonthLocalISO(date: Date = new Date()) {
  return toLocalDateISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}
