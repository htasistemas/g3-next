import { normalizarCnpj, normalizarCpf, normalizarTelefone, validarCnpj, validarCpf } from "../../../utils/br-utils.js";

type JsonLike =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLike[]
  | { [key: string]: JsonLike };

const emailRegex = /\b([a-z0-9._%+-]{1,64})@([a-z0-9.-]+\.[a-z]{2,})\b/gi;
const documentoRegex = /\b\d[\d./-]{9,17}\d\b/g;
const telefoneRegex = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-.\s]?\d{4}\b/g;

function repetirMascara(tamanho: number) {
  return "*".repeat(Math.max(0, tamanho));
}

function mascararEmail(email: string) {
  const [local, dominio] = email.split("@");
  if (!local || !dominio) return email;

  const prefixo = local.slice(0, Math.min(2, local.length));
  return `${prefixo}${repetirMascara(Math.max(3, local.length - prefixo.length))}@${dominio}`;
}

function mascararCpf(valor: string) {
  const cpf = normalizarCpf(valor);
  if (!cpf || cpf.length !== 11) return valor;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

function mascararCnpj(valor: string) {
  const cnpj = normalizarCnpj(valor);
  if (!cnpj || cnpj.length !== 14) return valor;
  return `**.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-**`;
}

function mascararTelefone(valor: string) {
  const telefone = normalizarTelefone(valor);
  if (!telefone || ![10, 11, 12, 13].includes(telefone.length)) return valor;

  const sufixo = telefone.slice(-4);
  const dddInicio = telefone.length > 11 ? telefone.length - 10 : 0;
  const ddd = telefone.slice(dddInicio, dddInicio + 2);
  const prefixo = telefone.slice(dddInicio + 2, -4);
  const codigoPais = dddInicio > 0 ? `+${telefone.slice(0, dddInicio)} ` : "";

  return `${codigoPais}(${ddd}) ${repetirMascara(prefixo.length)}-${sufixo}`;
}

export function sanitizeAiHistoryText(texto: string) {
  return texto
    .replace(emailRegex, (valor) => mascararEmail(valor))
    .replace(documentoRegex, (valor) => {
      const cpf = normalizarCpf(valor);
      if (cpf && validarCpf(cpf)) {
        return mascararCpf(valor);
      }

      const cnpj = normalizarCnpj(valor);
      if (cnpj && validarCnpj(cnpj)) {
        return mascararCnpj(valor);
      }

      return valor;
    })
    .replace(telefoneRegex, (valor) => {
      const telefone = normalizarTelefone(valor);
      if (!telefone || ![10, 11, 12, 13].includes(telefone.length)) {
        return valor;
      }

      if (telefone.length === 11 && validarCpf(telefone)) {
        return valor;
      }

      if (telefone.length === 14 && validarCnpj(telefone)) {
        return valor;
      }

      return mascararTelefone(valor);
    });
}

export function sanitizeAiHistoryValue<T extends JsonLike>(valor: T): T {
  if (typeof valor === "string") {
    return sanitizeAiHistoryText(valor) as T;
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizeAiHistoryValue(item)) as T;
  }

  if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, sanitizeAiHistoryValue(item as JsonLike)])
    ) as T;
  }

  return valor;
}
