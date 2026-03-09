import { z } from "zod";
import { isValidCep, isValidCnpj, isValidCpf, isValidPhone } from "../../utils/validators.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().nonnegative().optional());

const requiredInteger = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().nonnegative());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().nonnegative().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const doadorInputSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do doador."),
  tipo_pessoa: optionalTrimmedString,
  documento: optionalTrimmedString.refine(
    (value) => {
      if (!value) return true;
      const documento = value.replace(/\D/g, "");
      if (documento.length === 11) return isValidCpf(value);
      if (documento.length === 14) return isValidCnpj(value);
      return true;
    },
    { message: "Documento invalido." }
  ),
  responsavel_empresa: optionalTrimmedString,
  email: z.union([z.string().trim().email("E-mail invalido."), z.undefined()]).optional(),
  telefone: optionalTrimmedString.refine((value) => !value || isValidPhone(value), "Telefone invalido."),
  logradouro: optionalTrimmedString,
  numero: optionalTrimmedString,
  complemento: optionalTrimmedString,
  bairro: optionalTrimmedString,
  cidade: optionalTrimmedString,
  uf: optionalTrimmedString,
  cep: optionalTrimmedString.refine((value) => !value || isValidCep(value), "CEP invalido."),
  observacoes: optionalTrimmedString
});

export const registroDoacaoItemInputSchema = z.object({
  descricao: z.string().trim().min(2, "Informe a descricao do item."),
  quantidade: requiredInteger,
  unidade: optionalTrimmedString,
  valor_unitario: optionalNumber,
  valor_total: optionalNumber,
  marca: optionalTrimmedString,
  modelo: optionalTrimmedString,
  conservacao: optionalTrimmedString,
  observacoes: optionalTrimmedString
});

export const registroDoacaoInputSchema = z.object({
  doador_id: optionalInteger,
  conta_recebimento_id: optionalInteger,
  tipo_doacao: z.string().trim().min(2, "Informe o tipo de doacao."),
  descricao: optionalTrimmedString,
  quantidade_itens: optionalInteger,
  valor_medio: optionalNumber,
  valor_total: optionalNumber,
  valor: optionalNumber,
  data_recebimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de recebimento invalida."),
  forma_recebimento: optionalTrimmedString,
  recorrente: z.boolean().default(false),
  periodicidade: optionalTrimmedString,
  proxima_cobranca: optionalIsoDate,
  status: z.string().trim().min(2, "Informe o status."),
  observacoes: optionalTrimmedString,
  itens: z.array(registroDoacaoItemInputSchema).optional()
});

export const registroDoacaoFiltersSchema = z.object({
  doador_nome: optionalTrimmedString,
  tipo_doacao: optionalTrimmedString,
  status: optionalTrimmedString,
  data_inicial: optionalIsoDate,
  data_final: optionalIsoDate
});
