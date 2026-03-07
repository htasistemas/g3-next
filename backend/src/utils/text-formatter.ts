import {
  camposTecnicosIgnorados,
  conectivosMinusculos,
  siglasPreservadas,
  type TipoFormatacaoTexto
} from "./text-format-config.js";

const separadoresInternosRegex = /([\-/'`])/g;
const tokenComPontuacaoRegex = /^([^\p{L}\p{N}]*)((?:[\p{L}\p{N}])+)([^\p{L}\p{N}]*)$/u;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRegex = /^(https?:\/\/|www\.)/i;
const romanRegex = /^(?=[ivxlcdm]+$)[ivxlcdm]+$/i;

function capitalizarPalavra(valor: string): string {
  if (!valor) return valor;
  const lower = valor.toLocaleLowerCase("pt-BR");
  const caracteres = [...lower];
  if (!caracteres.length) return lower;
  return `${caracteres[0].toLocaleUpperCase("pt-BR")}${caracteres.slice(1).join("")}`;
}

function tokenEhTecnico(token: string): boolean {
  return emailRegex.test(token) || urlRegex.test(token);
}

function tokenEhNumerico(token: string): boolean {
  return /^[\d./-]+$/.test(token);
}

function ehTextoLivreComplexo(valor: string): boolean {
  return valor.length > 120 || /[.!?;:\n]/.test(valor);
}

function ehSiglaConhecida(token: string): boolean {
  const normalizado = token.replace(/[^\p{L}\p{N}/-]/gu, "").toUpperCase();
  return siglasPreservadas.has(normalizado);
}

function formatarParteTexto(token: string, indicePalavra: number): string {
  if (!token) return token;
  if (tokenEhTecnico(token) || tokenEhNumerico(token)) return token;

  const match = token.match(tokenComPontuacaoRegex);
  if (!match) {
    if (ehSiglaConhecida(token)) return token.toUpperCase();
    if (romanRegex.test(token)) return token.toUpperCase();
    return capitalizarPalavra(token);
  }

  const [, prefixo, nucleo, sufixo] = match;
  const lower = nucleo.toLocaleLowerCase("pt-BR");

  let formatado = lower;
  if (ehSiglaConhecida(nucleo)) {
    formatado = nucleo.toUpperCase();
  } else if (romanRegex.test(nucleo)) {
    formatado = nucleo.toUpperCase();
  } else if (indicePalavra > 0 && conectivosMinusculos.has(lower)) {
    formatado = lower;
  } else if (nucleo.length === 1 && /[\p{L}]/u.test(nucleo)) {
    formatado = nucleo.toUpperCase();
  } else {
    formatado = capitalizarPalavra(lower);
  }

  return `${prefixo}${formatado}${sufixo}`;
}

function formatarTokenComSeparadores(token: string, indicePalavra: number): string {
  if (!token) return token;
  const partes = token.split(separadoresInternosRegex);

  let indiceCorrente = indicePalavra;
  return partes
    .map((parte, indice) => {
      if (indice % 2 === 1) {
        return parte;
      }
      const formatado = formatarParteTexto(parte, indiceCorrente);
      if (formatado.trim().length > 0) {
        indiceCorrente += 1;
      }
      return formatado;
    })
    .join("");
}

export function normalizarEspacos(valor?: string | null): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/\s+/g, " ").trim();
}

export function deveFormatarCampo(campo: string, valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  if (camposTecnicosIgnorados.has(campo)) return false;

  const limpo = normalizarEspacos(valor);
  if (!limpo) return false;
  if (tokenEhTecnico(limpo)) return false;
  return true;
}

export function formatarTextoPadrao(valor?: string | null): string {
  const limpo = normalizarEspacos(valor);
  if (!limpo) return "";

  const tokens = limpo.split(" ").filter(Boolean);
  let indicePalavra = 0;

  return tokens
    .map((token) => {
      const formatado = formatarTokenComSeparadores(token, indicePalavra);
      if (formatado.trim().length > 0) {
        indicePalavra += 1;
      }
      return formatado;
    })
    .join(" ");
}

export function formatarNomePessoa(valor?: string | null): string {
  return formatarTextoPadrao(valor);
}

export function formatarEndereco(valor?: string | null): string {
  return formatarTextoPadrao(valor);
}

export function formatarNomeInstituicao(valor?: string | null): string {
  return formatarTextoPadrao(valor);
}

export function formatarTextoCurto(valor?: string | null): string {
  const limpo = normalizarEspacos(valor);
  if (!limpo) return "";
  if (ehTextoLivreComplexo(limpo)) {
    return limpo;
  }
  return formatarTextoPadrao(limpo);
}

export function formatarTextoPorTipo(
  valor: string,
  tipoFormatacao: TipoFormatacaoTexto
): string {
  switch (tipoFormatacao) {
    case "nomePessoa":
      return formatarNomePessoa(valor);
    case "endereco":
      return formatarEndereco(valor);
    case "instituicao":
      return formatarNomeInstituicao(valor);
    case "textoCurto":
    default:
      return formatarTextoCurto(valor);
  }
}

export function formatarTextoPorCampo(
  campo: string,
  valor: unknown,
  mapaCampos: Record<string, TipoFormatacaoTexto>
): unknown {
  if (!deveFormatarCampo(campo, valor)) {
    return typeof valor === "string" ? normalizarEspacos(valor) : valor;
  }

  const tipo = mapaCampos[campo];
  if (!tipo) {
    return normalizarEspacos(valor);
  }

  return formatarTextoPorTipo(valor, tipo);
}

export function normalizarObjetoTexto<T extends Record<string, unknown>>(
  input: T,
  mapaCampos: Record<string, TipoFormatacaoTexto>
): T {
  const output: Record<string, unknown> = { ...input };

  for (const [campo, tipo] of Object.entries(mapaCampos)) {
    const valor = output[campo];
    if (typeof valor !== "string") continue;
    if (!deveFormatarCampo(campo, valor)) {
      output[campo] = normalizarEspacos(valor);
      continue;
    }
    output[campo] = formatarTextoPorTipo(valor, tipo);
  }

  return output as T;
}
