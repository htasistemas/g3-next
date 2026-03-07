import { z } from "zod";
import { isValidCep, isValidCpf } from "../../utils/validators.js";
import { voluntarioStatusValues } from "./voluntario.types.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}, z.boolean().optional());

const optionalId = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const optionalStringArray = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.split(/[;,]/g).map((item) => item.trim());
  }
  return value;
}, z.array(z.string().trim().min(1)).optional());

export const voluntarioInputSchema = z.object({
  profissional_id: optionalId,
  nome_completo: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z
    .string()
    .trim()
    .refine((value) => isValidCpf(value), "Informe um CPF valido."),
  rg: optionalTrimmedString,
  foto_3x4: optionalTrimmedString,
  data_nascimento: optionalIsoDate,
  genero: optionalTrimmedString,
  profissao: optionalTrimmedString,
  motivacao: optionalTrimmedString,
  telefone: optionalTrimmedString,
  email: z.string().trim().email("Informe um e-mail valido."),
  cidade: optionalTrimmedString,
  estado: optionalTrimmedString,
  area_interesse: optionalTrimmedString,
  habilidades: optionalTrimmedString,
  idiomas: optionalTrimmedString,
  linkedin: optionalTrimmedString,
  status: z.enum(voluntarioStatusValues).default("ATIVO"),
  disponibilidade_dias: optionalStringArray,
  disponibilidade_periodos: optionalStringArray,
  carga_horaria_semanal: optionalTrimmedString,
  presencial: optionalBoolean,
  remoto: optionalBoolean,
  inicio_previsto: optionalIsoDate,
  observacoes: optionalTrimmedString,
  documento_identificacao: optionalTrimmedString,
  comprovante_endereco: optionalTrimmedString,
  aceite_voluntariado: optionalBoolean,
  aceite_imagem: optionalBoolean,
  assinatura_digital: optionalTrimmedString,
  cep: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isValidCep(value), "Informe um CEP valido."),
  logradouro: optionalTrimmedString,
  numero: optionalTrimmedString,
  complemento: optionalTrimmedString,
  bairro: optionalTrimmedString,
  ponto_referencia: optionalTrimmedString,
  municipio: optionalTrimmedString,
  zona: optionalTrimmedString,
  subzona: optionalTrimmedString,
  uf: optionalTrimmedString
});

export const voluntarioFiltersSchema = z.object({
  nome: optionalTrimmedString,
  status: optionalTrimmedString,
  cpf: optionalTrimmedString,
  email: optionalTrimmedString
});
