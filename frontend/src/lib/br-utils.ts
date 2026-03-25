import { validarCep, validarCnpj, validarCpf, somenteDigitos } from "./validators";

export { validarCep, validarCnpj, validarCpf, somenteDigitos };

export function normalizarCpf(valor?: string | null) {
  return somenteDigitos(valor);
}

export function normalizarCnpj(valor?: string | null) {
  return somenteDigitos(valor);
}

export function formatarCpf(valor?: string | null) {
  const digitos = normalizarCpf(valor);
  if (digitos.length !== 11) return valor?.trim() || "";
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

export function formatarCnpj(valor?: string | null) {
  const digitos = normalizarCnpj(valor);
  if (digitos.length !== 14) return valor?.trim() || "";
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

export function normalizarTelefone(valor?: string | null) {
  return somenteDigitos(valor);
}

export function formatarTelefone(valor?: string | null) {
  const digitos = normalizarTelefone(valor);
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor?.trim() || "";
}

export function mascararTelefoneInput(valor?: string | null) {
  const digitos = normalizarTelefone(valor).slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function normalizarCep(valor?: string | null) {
  return somenteDigitos(valor);
}

export function formatarCep(valor?: string | null) {
  const digitos = normalizarCep(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

export function normalizarEmail(valor?: string | null) {
  const texto = valor?.trim().toLowerCase();
  return texto || "";
}

export function normalizarMoeda(valor?: string | number | null) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = valor?.trim();
  if (!texto) return 0;

  if (/^\d+$/.test(texto)) {
    return Number(texto);
  }

  if (texto.includes(",")) {
    const normalizado = texto.replace(/\./g, "").replace(",", ".");
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  if (texto.includes(".")) {
    const partes = texto.split(".");
    const ultimaParte = partes[partes.length - 1] ?? "";
    const numero =
      /^\d{1,2}$/.test(ultimaParte) && partes.length === 2
        ? Number(texto)
        : Number(texto.replace(/\./g, ""));
    return Number.isFinite(numero) ? numero : 0;
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarMoeda(valor?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor ?? 0));
}

export function formatarMoedaInput(valor?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(normalizarMoeda(valor));
}

export function validarEmail(valor?: string | null) {
  const email = normalizarEmail(valor);
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatarDataPtBr(valor?: string | null) {
  if (!valor?.trim()) return "";
  const texto = valor.trim();
  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) {
    const [, ano, mes, dia] = matchIso;
    return `${dia}-${mes}-${ano}`;
  }

  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return texto;
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = String(data.getFullYear());
  return `${dia}-${mes}-${ano}`;
}

export function calcularIdade(dataIso?: string | null) {
  if (!dataIso) return undefined;
  const data = new Date(`${dataIso}T00:00:00`);
  if (Number.isNaN(data.getTime())) return undefined;
  const hoje = new Date();
  let idade = hoje.getFullYear() - data.getFullYear();
  const aniversarioAindaNaoPassou =
    hoje.getMonth() < data.getMonth() ||
    (hoje.getMonth() === data.getMonth() && hoje.getDate() < data.getDate());
  if (aniversarioAindaNaoPassou) idade -= 1;
  return idade >= 0 ? idade : undefined;
}
