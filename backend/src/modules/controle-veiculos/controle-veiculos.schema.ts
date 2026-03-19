import { z } from "zod";
import { isValidPhone } from "../../utils/validators.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().nonnegative().optional());

const optionalInteger = z.preprocess((value) => {
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

const optionalHour = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{2}:\d{2}$/).optional());

const tipoOrigemMotorista = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalized === "PROFISSIONAL") return "PROFISSIONAL";
  if (normalized === "VOLUNTARIO") return "VOLUNTARIO";
  return normalized;
}, z.enum(["PROFISSIONAL", "VOLUNTARIO"]));

export const veiculoInputSchema = z.object({
  placa: optionalTrimmedString.nullable().optional(),
  modelo: optionalTrimmedString.nullable().optional(),
  marca: optionalTrimmedString.nullable().optional(),
  cor: optionalTrimmedString.nullable().optional(),
  ano: optionalInteger.nullable().optional(),
  tipoCombustivel: optionalTrimmedString.nullable().optional(),
  mediaConsumoPadrao: optionalNumber.nullable().optional(),
  capacidadeTanqueLitros: optionalNumber.nullable().optional(),
  observacoes: optionalTrimmedString.nullable().optional(),
  ativo: z.boolean().nullable().optional(),
  fotoFrente: optionalTrimmedString.nullable().optional(),
  fotoLateralEsquerda: optionalTrimmedString.nullable().optional(),
  fotoLateralDireita: optionalTrimmedString.nullable().optional(),
  fotoTraseira: optionalTrimmedString.nullable().optional(),
  documentoVeiculoPdf: optionalTrimmedString.nullable().optional()
});

export const diarioBordoInputSchema = z.object({
  veiculoId: optionalInteger.nullable().optional(),
  data: optionalIsoDate.nullable().optional(),
  dataSaida: optionalIsoDate.nullable().optional(),
  dataChegada: optionalIsoDate.nullable().optional(),
  condutor: optionalTrimmedString.nullable().optional(),
  horarioSaida: optionalHour.nullable().optional(),
  kmInicial: optionalNumber.nullable().optional(),
  horarioChegada: optionalHour.nullable().optional(),
  kmFinal: optionalNumber.nullable().optional(),
  localDestinoId: optionalInteger.nullable().optional(),
  destino: optionalTrimmedString.nullable().optional(),
  combustivelConsumidoLitros: optionalNumber.nullable().optional(),
  observacoes: optionalTrimmedString.nullable().optional()
});

export const motoristaAutorizadoInputSchema = z.object({
  veiculoId: z.coerce.number().int().positive(),
  tipoOrigem: tipoOrigemMotorista,
  motoristaId: z.coerce.number().int().positive(),
  numeroCarteira: optionalTrimmedString.nullable().optional(),
  categoriaCarteira: optionalTrimmedString.nullable().optional(),
  vencimentoCarteira: optionalIsoDate.nullable().optional(),
  arquivoCarteiraPdf: optionalTrimmedString.nullable().optional()
});

export const localDestinoInputSchema = z.object({
  nome: optionalTrimmedString.nullable().optional(),
  endereco: optionalTrimmedString.nullable().optional(),
  telefone: optionalTrimmedString
    .nullable()
    .optional()
    .refine((value) => !value || isValidPhone(value), "Informe um telefone valido."),
  observacoes: optionalTrimmedString.nullable().optional(),
  ativo: z.boolean().nullable().optional()
});
