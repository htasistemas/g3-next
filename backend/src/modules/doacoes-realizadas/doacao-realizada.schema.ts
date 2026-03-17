import { z } from "zod";

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
}, z.number().int().positive().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return value;
}, z.boolean().optional());

export const doacaoRealizadaItemInputSchema = z.object({
  item_id: z.preprocess((value) => Number(value), z.number().int().positive()),
  quantidade: z.preprocess((value) => Number(value), z.number().int().positive()),
  observacoes: optionalTrimmedString
});

export const doacaoRealizadaInputSchema = z
  .object({
    beneficiario_id: optionalInteger,
    vinculo_familiar_id: optionalInteger,
    tipo_doacao: z.string().trim().min(2, "Informe o tipo de doacao."),
    situacao: z.string().trim().min(2, "Informe a situacao."),
    responsavel: optionalTrimmedString,
    observacoes: optionalTrimmedString,
    data_doacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de doacao invalida."),
    autorizar_fora_carencia: optionalBoolean,
    senha_administrativa: optionalTrimmedString,
    itens: z.array(doacaoRealizadaItemInputSchema).min(1, "Adicione pelo menos um item.")
  })
  .refine((value) => Boolean(value.beneficiario_id || value.vinculo_familiar_id), {
    message: "Selecione beneficiario ou familia.",
    path: ["beneficiario_id"]
  })
  .refine((value) => !(value.beneficiario_id && value.vinculo_familiar_id), {
    message: "Selecione apenas beneficiario ou familia.",
    path: ["vinculo_familiar_id"]
  });

export const doacaoRealizadaFiltersSchema = z.object({
  beneficiario_nome: optionalTrimmedString,
  tipo_doacao: optionalTrimmedString,
  situacao: optionalTrimmedString,
  data_inicial: optionalTrimmedString,
  data_final: optionalTrimmedString
});
