import { z } from "zod";
import { normalizarMoeda } from "@/lib/br-utils";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return normalizarMoeda(value);
  return value;
}, z.number().nonnegative().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().nonnegative().optional());

export const registroDoacaoItemSchema = z.object({
  descricao: z.string().trim().min(2, "Informe a descrição do item."),
  quantidade: z.preprocess((value) => Number(value), z.number().int().min(1)),
  unidade: optionalTrimmedString,
  valor_unitario: optionalNumber,
  valor_total: optionalNumber,
  marca: optionalTrimmedString,
  modelo: optionalTrimmedString,
  conservacao: optionalTrimmedString,
  observacoes: optionalTrimmedString
});

export const registroDoacaoFormSchema = z
  .object({
    id_registro_doacao: z.string().optional(),
    doador_id: optionalTrimmedString,
    numero_recibo: optionalTrimmedString,
    tipo_doacao: z.string().trim().min(2, "Informe o tipo de doação."),
    descricao: optionalTrimmedString,
    quantidade_itens: optionalInteger,
    valor_medio: optionalNumber,
    valor_total: optionalNumber,
    valor: optionalNumber,
    data_recebimento: z.string().trim().min(10, "Informe a data de recebimento."),
    forma_recebimento: optionalTrimmedString,
    recorrente: z.boolean().default(false),
    periodicidade: optionalTrimmedString,
    proxima_cobranca: optionalTrimmedString,
    status: z.string().trim().min(2, "Informe o status."),
    observacoes: optionalTrimmedString
  })
  .superRefine((values, ctx) => {
    if (!values.doador_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doador_id"],
        message: "Selecione o doador."
      });
    }

    if (values.tipo_doacao === "Doação financeira" && !values.forma_recebimento?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["forma_recebimento"],
        message: "Informe a forma de recebimento."
      });
    }

    if (values.recorrente && !values.periodicidade?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodicidade"],
        message: "Informe a periodicidade."
      });
    }
  });

export type RegistroDoacaoFormInput = z.input<typeof registroDoacaoFormSchema>;
export type RegistroDoacaoFormValues = z.infer<typeof registroDoacaoFormSchema>;

export const registroDoacaoDefaultValues: RegistroDoacaoFormValues = {
  numero_recibo: "",
  tipo_doacao: "",
  descricao: "",
  quantidade_itens: undefined,
  valor_medio: undefined,
  valor_total: undefined,
  valor: undefined,
  data_recebimento: new Date().toISOString().slice(0, 10),
  forma_recebimento: "",
  recorrente: false,
  periodicidade: "",
  proxima_cobranca: "",
  status: "Aguardando",
  observacoes: ""
};

export const tipoDoacaoOptions = [
  "Doação financeira",
  "Doação de bens de consumo",
  "Doação de bens permanentes"
] as const;

export const statusRegistroDoacaoOptions = [
  "Aguardando",
  "Confirmado",
  "Finalizado",
  "Cancelado"
] as const;

