import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

export const doacaoRealizadaFormSchema = z.object({
  id_doacao_realizada: z.string().optional(),
  beneficiario_id: optionalTrimmedString,
  vinculo_familiar_id: optionalTrimmedString,
  tipo_doacao: z.string().trim().min(2, "Informe o tipo de doação."),
  situacao: z.string().trim().min(2, "Informe a situação."),
  responsavel: optionalTrimmedString,
  observacoes: optionalTrimmedString,
  data_doacao: z.string().trim().min(10, "Informe a data da doação.")
});

export type DoacaoRealizadaFormInput = z.input<typeof doacaoRealizadaFormSchema>;
export type DoacaoRealizadaFormValues = z.infer<typeof doacaoRealizadaFormSchema>;

export const doacaoRealizadaDefaultValues: DoacaoRealizadaFormValues = {
  beneficiario_id: "",
  vinculo_familiar_id: "",
  tipo_doacao: "",
  situacao: "Entregue",
  responsavel: "",
  observacoes: "",
  data_doacao: new Date().toISOString().slice(0, 10)
};

export const situacaoDoacaoRealizadaOptions = [
  "Entregue",
  "Parcial",
  "Cancelada"
] as const;
