function normalizarHex(valor: string) {
  const limpo = valor.trim();
  const hex = limpo.startsWith("#") ? limpo : `#${limpo}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return "#000000";
  }
  return hex.toUpperCase();
}

function parseRgb(hex: string) {
  const valor = normalizarHex(hex).replace("#", "");
  return {
    r: Number.parseInt(valor.slice(0, 2), 16),
    g: Number.parseInt(valor.slice(2, 4), 16),
    b: Number.parseInt(valor.slice(4, 6), 16)
  };
}

function toHex(valor: number) {
  return Math.max(0, Math.min(255, valor)).toString(16).padStart(2, "0").toUpperCase();
}

export function mixColors(corBase: string, corAlvo: string, percentualAlvo: number) {
  const base = parseRgb(corBase);
  const alvo = parseRgb(corAlvo);
  const fator = Math.max(0, Math.min(1, percentualAlvo));

  const r = Math.round(base.r * (1 - fator) + alvo.r * fator);
  const g = Math.round(base.g * (1 - fator) + alvo.g * fator);
  const b = Math.round(base.b * (1 - fator) + alvo.b * fator);

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lighten(cor: string, percentual: number) {
  return mixColors(cor, "#FFFFFF", percentual);
}

export function darken(cor: string, percentual: number) {
  return mixColors(cor, "#000000", percentual);
}

export function sanitizeHex(cor: string, fallback: string) {
  const valor = cor?.trim();
  if (!valor) return fallback;
  const normalizado = valor.startsWith("#") ? valor : `#${valor}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalizado) ? normalizado.toUpperCase() : fallback;
}
