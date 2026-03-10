import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalIsoDateTime = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/).optional());
export const statusEmprestimoSchema = z.enum([
    "RASCUNHO",
    "AGENDADO",
    "RETIRADO",
    "DEVOLVIDO",
    "CANCELADO"
]);
export const tipoItemSchema = z.enum(["PATRIMONIO", "ALMOXARIFADO"]);
export const eventoEmprestimoInputSchema = z
    .object({
    titulo: z.string().trim().min(2, "Informe o titulo."),
    descricao: optionalTrimmedString.nullable().optional(),
    local: optionalTrimmedString.nullable().optional(),
    dataInicio: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    dataFim: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    status: optionalTrimmedString.nullable().optional()
})
    .superRefine((input, ctx) => {
    if (new Date(input.dataFim) < new Date(input.dataInicio)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Data final do evento nao pode ser menor que a inicial.",
            path: ["dataFim"]
        });
    }
});
export const emprestimoEventoItemInputSchema = z.object({
    itemId: z.coerce.number().int().positive(),
    tipoItem: tipoItemSchema,
    quantidade: z.coerce.number().int().positive(),
    statusItem: optionalTrimmedString.optional(),
    observacaoItem: optionalTrimmedString.nullable().optional()
});
export const emprestimoEventoInputSchema = z
    .object({
    eventoId: z.coerce.number().int().positive(),
    unidadeId: z.coerce.number().int().positive().nullable().optional(),
    responsavelId: z.coerce.number().int().positive().nullable().optional(),
    dataRetiradaPrevista: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    dataDevolucaoPrevista: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    dataRetiradaReal: optionalIsoDateTime.nullable().optional(),
    dataDevolucaoReal: optionalIsoDateTime.nullable().optional(),
    status: statusEmprestimoSchema,
    observacoes: optionalTrimmedString.nullable().optional(),
    itens: z.array(emprestimoEventoItemInputSchema).optional()
})
    .superRefine((input, ctx) => {
    if (new Date(input.dataDevolucaoPrevista) < new Date(input.dataRetiradaPrevista)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Data de devolucao nao pode ser menor que a de retirada.",
            path: ["dataDevolucaoPrevista"]
        });
    }
});
export const disponibilidadeQuerySchema = z.object({
    itemId: z.coerce.number().int().positive(),
    tipoItem: tipoItemSchema,
    quantidade: z.coerce.number().int().positive().optional(),
    inicio: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    fim: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
    emprestimoId: z.coerce.number().int().positive().optional()
});
