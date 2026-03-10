export interface PartesData {
  dia: number;
  mes: number;
  ano: number;
}

export function extrairPartesData(valor?: string | null): PartesData | null {
  if (!valor) return null;
  const dataSemHora = valor.split('T')[0];
  if (dataSemHora.includes('/')) {
    const [dia, mes, ano] = dataSemHora.split('/');
    return montarPartesData(ano, mes, dia);
  }
  const [ano, mes, dia] = dataSemHora.split('-');
  return montarPartesData(ano, mes, dia);
}

export function formatarDataSemFuso(valor?: string | null): string {
  const partes = extrairPartesData(valor);
  if (!partes) return '---';
  return `${pad(partes.dia)}/${pad(partes.mes)}/${partes.ano}`;
}

export function criarDataLocal(valor?: string | null): Date | null {
  const partes = extrairPartesData(valor);
  if (!partes) return null;
  return new Date(partes.ano, partes.mes - 1, partes.dia);
}

function montarPartesData(ano?: string, mes?: string, dia?: string): PartesData | null {
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  const diaNum = Number(dia);
  if (!anoNum || !mesNum || !diaNum) return null;
  return { ano: anoNum, mes: mesNum, dia: diaNum };
}

function pad(valor: number): string {
  return String(valor).padStart(2, '0');
}

