import { z } from "zod";
import { geoAgeGroupValues, geoEntityTypeValues, geoLayerValues, geoManualCategoryValues, geoPeriodKindValues, geoViewModeValues } from "./dashboard-georreferenciamento.types.js";
function parseStringList(value) {
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
const optionalTrimmedString = z.preprocess((value) => (typeof value === "string" && value.trim().length ? value.trim() : undefined), z.string().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().nonnegative().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalizado = value.trim().toLowerCase();
        if (["true", "1", "sim", "yes"].includes(normalizado))
            return true;
        if (["false", "0", "nao", "não", "no"].includes(normalizado))
            return false;
    }
    return value;
}, z.boolean().optional());
const optionalNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().finite().optional());
const optionalIsoDate = z.preprocess((value) => (typeof value === "string" && value.trim().length ? value.trim() : undefined), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data valida no formato AAAA-MM-DD.").optional());
const stringListSchema = z.preprocess((value) => parseStringList(value), z.array(z.string().min(1)).default([]));
const bboxSchema = z
    .object({
    north: optionalNumber,
    south: optionalNumber,
    east: optionalNumber,
    west: optionalNumber
})
    .transform((bbox) => {
    if (bbox.north === undefined ||
        bbox.south === undefined ||
        bbox.east === undefined ||
        bbox.west === undefined) {
        return undefined;
    }
    return {
        north: bbox.north,
        south: bbox.south,
        east: bbox.east,
        west: bbox.west
    };
});
export const dashboardGeorreferenciamentoConsultaSchema = z
    .object({
    camadas: z.preprocess((value) => {
        const lista = parseStringList(value);
        return lista.length ? lista : [...geoLayerValues];
    }, z.array(z.enum(geoLayerValues)).default([...geoLayerValues])),
    modo: z.enum(geoViewModeValues).default("cluster"),
    zoom: z.preprocess((value) => {
        if (typeof value === "number")
            return value;
        if (typeof value === "string" && value.trim().length)
            return Number(value);
        return 12;
    }, z.number().min(1).max(20).default(12)),
    bbox: bboxSchema.optional(),
    bairro: stringListSchema,
    microterritorio: stringListSchema,
    idadeExata: optionalInteger,
    faixaEtaria: z.preprocess((value) => parseStringList(value), z.array(z.enum(geoAgeGroupValues)).default([])),
    sexo: stringListSchema,
    situacaoVulnerabilidade: stringListSchema,
    status: stringListSchema,
    projetoServico: optionalTrimmedString,
    unidadeReferencia: stringListSchema,
    periodoTipo: z.enum(geoPeriodKindValues).default("cadastro"),
    periodoInicio: optionalIsoDate,
    periodoFim: optionalIsoDate,
    receberCestaBasica: optionalBoolean,
    necessidadeCesta: optionalBoolean,
    ocorrenciaViolencia: optionalBoolean,
    termo: optionalTrimmedString
})
    .superRefine((payload, context) => {
    if (payload.periodoInicio && payload.periodoFim && payload.periodoInicio > payload.periodoFim) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["periodoFim"],
            message: "A data final deve ser maior ou igual a data inicial."
        });
    }
    if (payload.idadeExata !== undefined && payload.idadeExata > 120) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["idadeExata"],
            message: "Informe uma idade valida."
        });
    }
    if (payload.bbox && payload.bbox.south > payload.bbox.north) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["bbox", "south"],
            message: "A latitude sul nao pode ser maior que a latitude norte."
        });
    }
});
export const dashboardGeorreferenciamentoBuscaVinculoSchema = z.object({
    termo: z.string().trim().min(2, "Informe ao menos 2 caracteres."),
    tipos: z.preprocess((value) => {
        const lista = parseStringList(value);
        return lista.length ? lista : [...geoEntityTypeValues];
    }, z.array(z.enum(geoEntityTypeValues)).default([...geoEntityTypeValues]))
});
export const dashboardGeorreferenciamentoMarcacaoSchema = z.object({
    acao: z.enum(["LOCALIZACAO_VINCULADA", "PONTO_TERRITORIAL"]),
    entidadeTipo: z.enum(geoEntityTypeValues).optional(),
    entidadeId: optionalTrimmedString,
    categoria: z.enum(geoManualCategoryValues).optional(),
    titulo: optionalTrimmedString,
    descricao: optionalTrimmedString,
    bairro: optionalTrimmedString,
    cidade: optionalTrimmedString,
    uf: optionalTrimmedString,
    regiao: optionalTrimmedString,
    logradouro: optionalTrimmedString,
    numero: optionalTrimmedString,
    telefone: optionalTrimmedString,
    situacaoResumo: optionalTrimmedString,
    programaServico: optionalTrimmedString,
    unidadeReferencia: optionalTrimmedString,
    status: optionalTrimmedString,
    ocorrenciaViolencia: optionalBoolean,
    situacaoVulnerabilidade: optionalBoolean,
    necessidadeCesta: optionalBoolean,
    pontoDistribuicao: optionalBoolean,
    latitude: z.preprocess((value) => Number(value), z.number().min(-90).max(90)),
    longitude: z.preprocess((value) => Number(value), z.number().min(-180).max(180))
}).superRefine((payload, context) => {
    if (payload.acao === "LOCALIZACAO_VINCULADA") {
        if (!payload.entidadeTipo) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["entidadeTipo"],
                message: "Informe o tipo da entidade vinculada."
            });
        }
        if (!payload.entidadeId) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["entidadeId"],
                message: "Informe a entidade vinculada."
            });
        }
    }
    if (payload.acao === "PONTO_TERRITORIAL") {
        if (!payload.categoria) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["categoria"],
                message: "Informe a categoria do ponto territorial."
            });
        }
        if (!payload.titulo) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["titulo"],
                message: "Informe um titulo para o ponto territorial."
            });
        }
    }
});
export const dashboardGeorreferenciamentoGeocodingSchema = z.object({
    limite: z.preprocess((value) => Number(value ?? 20), z.number().int().min(1).max(100)).default(20)
});
