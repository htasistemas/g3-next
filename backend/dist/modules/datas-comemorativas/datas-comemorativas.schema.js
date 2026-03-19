import { z } from "zod";
import { abrangenciaEventoValues, frequenciaSyncValues, tipoEventoValues } from "./datas-comemorativas.types.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "sim", "yes"].includes(normalized))
            return true;
        if (["false", "0", "nao", "não", "no"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean().optional());
const corExibicaoSchema = z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$|^[a-z][a-z0-9_-]{1,30}$/u, "Informe uma cor válida.")
    .optional();
export const dataComemorativaInputSchema = z
    .object({
    titulo: z.string().trim().min(3, "Informe o título."),
    descricao: optionalTrimmedString.nullable().optional(),
    dia: optionalNumber.nullable().optional(),
    mes: optionalNumber.nullable().optional(),
    ano: optionalNumber.nullable().optional(),
    dataEvento: optionalTrimmedString
        .nullable()
        .optional()
        .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/u.test(value), "Informe a data no formato ISO."),
    tipoEvento: z.enum(tipoEventoValues),
    abrangencia: z.enum(abrangenciaEventoValues),
    uf: optionalTrimmedString
        .nullable()
        .optional()
        .transform((value) => value?.toUpperCase()),
    municipio: optionalTrimmedString.nullable().optional(),
    recorrenteAnual: optionalBoolean.optional().default(true),
    fonteOrigem: optionalTrimmedString.nullable().optional(),
    origemReferencia: optionalTrimmedString.nullable().optional(),
    corExibicao: z.preprocess((value) => {
        if (value == null || value === "")
            return undefined;
        return value;
    }, corExibicaoSchema.nullable().optional()),
    icone: optionalTrimmedString.nullable().optional(),
    prioridadePopup: optionalNumber.nullable().optional(),
    exibirNoPopup: optionalBoolean.optional().default(true),
    ativo: optionalBoolean.optional().default(true)
})
    .superRefine((input, ctx) => {
    if (input.recorrenteAnual !== false) {
        if (!input.dia || input.dia < 1 || input.dia > 31) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["dia"],
                message: "Informe um dia válido."
            });
        }
        if (!input.mes || input.mes < 1 || input.mes > 12) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["mes"],
                message: "Informe um mês válido."
            });
        }
    }
    if (input.recorrenteAnual === false && !input.dataEvento) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["dataEvento"],
            message: "A data do evento é obrigatória para eventos não recorrentes."
        });
    }
    if (input.abrangencia === "estadual" && !input.uf) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["uf"],
            message: "Informe a UF para eventos estaduais."
        });
    }
    if (input.abrangencia === "municipal") {
        if (!input.uf) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["uf"],
                message: "Informe a UF para eventos municipais."
            });
        }
        if (!input.municipio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["municipio"],
                message: "Informe o município para eventos municipais."
            });
        }
    }
});
export const dataComemorativaFiltersSchema = z.object({
    termo: optionalTrimmedString.optional(),
    tipoEvento: optionalTrimmedString.optional(),
    abrangencia: optionalTrimmedString.optional(),
    uf: optionalTrimmedString.optional(),
    municipio: optionalTrimmedString.optional(),
    ativo: optionalTrimmedString.optional(),
    exibirNoPopup: optionalTrimmedString.optional(),
    origem: optionalTrimmedString.optional(),
    ano: optionalTrimmedString.optional(),
    mes: optionalTrimmedString.optional(),
    pagina: optionalTrimmedString.optional(),
    limite: optionalTrimmedString.optional(),
    ordenarPor: optionalTrimmedString.optional(),
    ordem: optionalTrimmedString.optional()
});
export const dataComemorativaConfiguracaoSchema = z.object({
    popupHabilitado: optionalBoolean.optional(),
    popupUmaVezPorDia: optionalBoolean.optional(),
    popupMostrarFeriados: optionalBoolean.optional(),
    popupMostrarComemorativas: optionalBoolean.optional(),
    popupMostrarEventosInternos: optionalBoolean.optional(),
    popupLimiteItens: optionalNumber.optional(),
    popupOrdenarPorPrioridade: optionalBoolean.optional(),
    sincronizacaoAutomatica: optionalBoolean.optional(),
    frequenciaSincronizacao: z.enum(frequenciaSyncValues).optional(),
    providerFeriadoPrincipal: optionalTrimmedString.optional(),
    providerFeriadoFallback: optionalTrimmedString.optional(),
    cacheDias: optionalNumber.optional(),
    ativo: optionalBoolean.optional()
});
export const dataComemorativaSyncSchema = z.object({
    ano: z.coerce.number().int().min(2000).max(2100),
    provider: z.string().trim().min(1).optional()
});
export const dataComemorativaSyncRangeSchema = z.object({
    inicio: z.coerce.number().int().min(2000).max(2100),
    fim: z.coerce.number().int().min(2000).max(2100),
    provider: z.string().trim().min(1).optional()
});
export const dataComemorativaPopupRegistroSchema = z.object({
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    eventIds: z.array(z.string()).optional(),
    acao: optionalTrimmedString.optional()
});
