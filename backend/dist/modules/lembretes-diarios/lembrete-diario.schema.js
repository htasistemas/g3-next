import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().positive().optional());
export const lembreteDiarioInputSchema = z.object({
    titulo: z.string().trim().min(3, "Informe o título do lembrete."),
    descricao: optionalTrimmedString,
    dataInicial: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    usuarioId: optionalInteger.nullable().optional(),
    todosUsuarios: z.boolean().optional(),
    horaAviso: z
        .preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().regex(/^\d{2}:\d{2}$/).optional())
        .nullable()
        .optional()
});
export const lembreteDiarioAdiarSchema = z.object({
    novaDataHora: z.string().trim().datetime().or(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/))
});
