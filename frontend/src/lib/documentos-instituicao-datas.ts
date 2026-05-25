function parseIsoDateOnly(value?: string | null) {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, ano, mes, dia] = match;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), 0, 0, 0, 0);
}

export function calcularDiasParaVencerDocumento(validade?: string | null, dataReferencia = new Date()) {
  const dataValidade = parseIsoDateOnly(validade);
  if (!dataValidade) return null;

  const referencia = new Date(dataReferencia);
  referencia.setHours(0, 0, 0, 0);

  return Math.ceil((dataValidade.getTime() - referencia.getTime()) / (1000 * 60 * 60 * 24));
}
