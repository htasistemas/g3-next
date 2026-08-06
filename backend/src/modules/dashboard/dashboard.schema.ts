import { z } from "zod";

const optionalIsoDate = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida no formato AAAA-MM-DD.").optional()
);

const dashboardFiltrosBaseSchema = z.object({
  startDate: optionalIsoDate,
  endDate: optionalIsoDate
});

export const dashboardFiltrosSchema = dashboardFiltrosBaseSchema
  .superRefine((filtros, context) => {
    if (filtros.startDate && filtros.endDate && filtros.startDate > filtros.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "A data final deve ser maior ou igual à data inicial."
      });
    }
  });

const optionalTexto = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  },
  z.string().max(160).optional()
);

export const dashboardGerencialFiltrosSchema = dashboardFiltrosBaseSchema.extend({
  periodoPreset: optionalTexto,
  unidade: optionalTexto,
  projeto: optionalTexto,
  programa: optionalTexto,
  servico: optionalTexto,
  profissional: optionalTexto,
  tipoAtendimento: optionalTexto,
  statusBeneficiario: optionalTexto,
  faixaEtaria: optionalTexto,
  sexo: optionalTexto,
  bairro: optionalTexto,
  cidade: optionalTexto,
  territorio: optionalTexto,
  origemEncaminhamento: optionalTexto
}).superRefine((filtros, context) => {
  if (filtros.startDate && filtros.endDate && filtros.startDate > filtros.endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "A data final deve ser maior ou igual à data inicial."
    });
  }
});
