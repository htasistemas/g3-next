import { z } from "zod";
import type { DashboardPowerBiPeriodoPreset } from "./power-bi.types.js";

const optionalIsoDate = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data valida no formato AAAA-MM-DD.").optional()
);

function parseListaStrings(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

const listaStringsSchema = z.preprocess(
  (value) => parseListaStrings(value),
  z.array(z.string().min(1)).default([])
);

const periodPresetValues = [
  "hoje",
  "ultimos7dias",
  "ultimos30dias",
  "mesAtual",
  "anoAtual",
  "personalizado"
] as const satisfies readonly DashboardPowerBiPeriodoPreset[];

const periodPresetSchema = z.enum(periodPresetValues).optional();

export const dashboardPowerBiFiltrosSchema = z
  .object({
    periodPreset: periodPresetSchema,
    startDate: optionalIsoDate,
    endDate: optionalIsoDate,
    unidades: listaStringsSchema,
    municipios: listaStringsSchema,
    bairros: listaStringsSchema,
    programas: listaStringsSchema,
    situacoesCadastro: listaStringsSchema,
    faixasEtarias: listaStringsSchema,
    generos: listaStringsSchema,
    responsaveisTecnicos: listaStringsSchema,
    tiposAtendimento: listaStringsSchema,
    origensEncaminhamento: listaStringsSchema,
    statusAcompanhamento: listaStringsSchema,
    familiaBeneficiario: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim().length ? value.trim() : undefined),
        z.string().max(200).optional()
      )
      .optional(),
    tecnicoUsuario: z
      .preprocess(
        (value) => (typeof value === "string" && value.trim().length ? value.trim() : undefined),
        z.string().max(200).optional()
      )
      .optional()
  })
  .superRefine((filtros, context) => {
    if (filtros.startDate && filtros.endDate && filtros.startDate > filtros.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data final deve ser maior ou igual a data inicial."
      });
    }

    if (filtros.periodPreset === "personalizado" && (!filtros.startDate || !filtros.endDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodPreset"],
        message: "No periodo personalizado informe data inicial e data final."
      });
    }
  });
