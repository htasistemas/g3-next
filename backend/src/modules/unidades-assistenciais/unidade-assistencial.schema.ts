import { z } from "zod";
import { isValidCep, isValidCnpj, isValidPhone } from "../../utils/validators.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}, z.boolean().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive().optional());

export const tipoUnidadeSchema = z.enum(["ASSISTENCIAL", "ENSINO"]);

export const diretoriaUnidadeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  nome_completo: z.string().trim().min(3, "Informe o nome completo da diretoria."),
  documento: z
    .string()
    .trim()
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 11;
    }, "Informe o documento da diretoria."),
  funcao: z.string().trim().min(2, "Informe a função da diretoria."),
  mandato_inicio: optionalTrimmedString,
  mandato_fim: optionalTrimmedString
});

export const salaUnidadeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  nome: z.string().trim().min(2, "Informe o nome da sala ou auditório."),
  ativo: optionalBoolean
});

export const unidadeAssistencialInputSchema = z.object({
  nome_fantasia: z.string().trim().min(3, "Informe o nome fantasia da unidade."),
  tipo_unidade: tipoUnidadeSchema.default("ASSISTENCIAL"),
  razao_social: optionalTrimmedString,
  cnpj: z
    .union([z.string().trim().refine((value) => isValidCnpj(value), "Informe um CNPJ valido."), z.undefined()])
    .optional(),
  telefone: z
    .union([
      z.string().trim().refine((value) => isValidPhone(value), "Informe um telefone valido."),
      z.undefined()
    ])
    .optional(),
  email: z.union([z.string().trim().email("E-mail invalido."), z.undefined()]).optional(),
  site: optionalTrimmedString,
  horario_funcionamento: optionalTrimmedString,
  observacoes: optionalTrimmedString,
  unidade_principal: optionalBoolean,
  cep: z
    .union([z.string().trim().refine((value) => isValidCep(value), "Informe um CEP valido."), z.undefined()])
    .optional(),
  logradouro: optionalTrimmedString,
  numero: optionalTrimmedString,
  complemento: optionalTrimmedString,
  bairro: optionalTrimmedString,
  ponto_referencia: optionalTrimmedString,
  cidade: optionalTrimmedString,
  estado: optionalTrimmedString,
  zona: optionalTrimmedString,
  subzona: optionalTrimmedString,
  latitude: optionalTrimmedString,
  longitude: optionalTrimmedString,
  raio_ponto_metros: optionalInteger,
  accuracy_max_ponto_metros: optionalInteger,
  ip_validacao_ponto: optionalTrimmedString,
  ips_publicos_ponto: optionalTrimmedString,
  redes_locais_ponto: optionalTrimmedString,
  modo_validacao_ponto: optionalTrimmedString,
  ping_timeout_ms: optionalInteger,
  logomarca: optionalTrimmedString,
  logomarca_relatorio: optionalTrimmedString,
  diretoria: z.array(diretoriaUnidadeSchema).optional(),
  salas: z.array(salaUnidadeSchema).optional()
});

export const unidadeAssistencialFiltersSchema = z.object({
  tipo_unidade: tipoUnidadeSchema.optional(),
  nome_fantasia: optionalTrimmedString,
  cnpj: optionalTrimmedString,
  cidade: optionalTrimmedString,
  unidade_principal: optionalBoolean
});
