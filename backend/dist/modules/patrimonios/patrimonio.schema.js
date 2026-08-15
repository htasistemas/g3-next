import { z } from "zod";
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
}, z.number().nonnegative().optional());
export const patrimonioInputSchema = z.object({
    numeroPatrimonio: z.string().trim().min(1, "Informe o número do patrimônio."),
    nome: z.string().trim().min(2, "Informe o nome do patrimônio."),
    categoria: optionalTrimmedString,
    subcategoria: optionalTrimmedString,
    conservacao: optionalTrimmedString,
    status: optionalTrimmedString,
    dataAquisicao: z
        .preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    valorAquisicao: optionalNumber,
    origem: optionalTrimmedString,
    responsavel: optionalTrimmedString,
    unidadeId: optionalTrimmedString,
    unidade: optionalTrimmedString,
    sala: optionalTrimmedString,
    taxaDepreciacao: optionalNumber,
    observacoes: optionalTrimmedString
}).superRefine((value, ctx) => {
    if (!value.unidadeId && !value.unidade) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["unidade"],
            message: "Selecione a unidade do patrimônio."
        });
    }
});
export const patrimonioMovimentoInputSchema = z.object({
    tipo: z.enum(["MOVIMENTACAO", "MANUTENCAO", "BAIXA"]),
    destino: optionalTrimmedString,
    responsavel: optionalTrimmedString,
    observacao: optionalTrimmedString,
    dataMovimento: z
        .preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional())
});
export const patrimonioCategoriaInputSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome da categoria."),
    taxaDepreciacao: z.preprocess((value) => {
        if (value === null || value === undefined || value === "")
            return undefined;
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return Number(value);
        return value;
    }, z.number().min(0).max(100).optional()),
    subcategorias: z.array(z.string().trim().min(1)).optional(),
    ativo: z.boolean().optional()
});
