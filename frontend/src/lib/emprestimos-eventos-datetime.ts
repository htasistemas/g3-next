function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function agoraLocalInputDateTime(data = new Date()) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export function normalizarDateTimeLocal(valor?: string | null) {
  if (!valor?.trim()) return "";
  const texto = valor.trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  }
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto.slice(0, 16);
  return agoraLocalInputDateTime(data);
}

export function formatarDateTimeLocalPtBr(valor?: string | null) {
  const normalizado = normalizarDateTimeLocal(valor);
  const match = normalizado.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "---";
  return `${match[3]}-${match[2]}-${match[1]} ${match[4]}:${match[5]}`;
}
