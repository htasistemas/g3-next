import { z } from "zod";
import { registroPontoOcorrenciaTipos } from "./registro-ponto.types.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const optionalTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora invalida.").optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "s"].includes(normalized)) return true;
    if (["false", "0", "nao", "n"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().finite().optional());

export const registroPontoFiltersSchema = z.object({
  data_inicial: optionalIsoDate,
  data_final: optionalIsoDate,
  usuario_id: optionalTrimmedString,
  status: z.enum(["COMPLETO", "INCOMPLETO"]).optional(),
  ocorrencia: optionalTrimmedString,
  unidade: optionalTrimmedString,
  somente_alterados: optionalBoolean,
  somente_inconsistencias: optionalBoolean
});

export const registroPontoMarcarSchema = z.object({
  latitude: optionalNumber,
  longitude: optionalNumber,
  accuracy_metros: optionalNumber,
  origem_manual: optionalTrimmedString,
  validar_localizacao: optionalBoolean
});

export const registroPontoAjusteSchema = z.object({
  entrada_1: optionalTime,
  saida_1: optionalTime,
  entrada_2: optionalTime,
  saida_2: optionalTime,
  observacoes: optionalTrimmedString,
  justificativa: z.string().trim().min(5, "Informe a justificativa do ajuste."),
  observacao: z.string().trim().min(5, "Informe a observacao do ajuste.")
});

export const registroPontoOcorrenciaSchema = z.object({
  tipo: z.enum(registroPontoOcorrenciaTipos),
  descricao: optionalTrimmedString
});
