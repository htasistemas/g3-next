import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().email("Informe um email valido.").optional());

const optionalSubject = optionalTrimmedString.refine(
  (value) => !value || !/[\r\n]/.test(value),
  "Assunto invalido."
);

export const emailTesteRequestSchema = z
  .object({
    destinatario: optionalEmail,
    assunto: optionalSubject,
    mensagem: optionalTrimmedString
  })
  .default({});

export const emailSimplesRequestSchema = z.object({
  destinatario: z.string().trim().email("Informe um email valido."),
  assunto: z
    .string()
    .trim()
    .min(3, "Informe o assunto.")
    .max(180, "Assunto muito longo.")
    .refine((value) => !/[\r\n]/.test(value), "Assunto invalido."),
  mensagem: z.string().trim().min(3, "Informe a mensagem.").max(10000, "Mensagem muito longa.")
});
