import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalObject = z.record(z.string(), z.unknown()).optional();

export const visitaDomiciliarInputSchema = z.object({
  beneficiarioId: z.coerce.number().int().positive(),
  unidade: z.string().trim().min(2, "Informe a unidade."),
  responsavel: z.string().trim().min(2, "Informe o responsavel."),
  dataVisita: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  horarioInicial: z.string().trim().min(4, "Informe o horario inicial."),
  horarioFinal: optionalTrimmedString.nullable().optional(),
  tipoVisita: optionalTrimmedString.nullable().optional(),
  situacao: z.enum(["Agendada", "Em andamento", "Realizada", "Cancelada"]),
  usarEnderecoBeneficiario: z.coerce.boolean(),
  endereco: optionalObject,
  observacoesIniciais: optionalTrimmedString.nullable().optional(),
  condicoes: optionalObject,
  situacaoSocial: optionalObject,
  registro: optionalObject,
  anexos: z.array(z.record(z.string(), z.unknown())).optional()
});
