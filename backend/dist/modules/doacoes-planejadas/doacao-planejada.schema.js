import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === "" || value === null || value === undefined)
        return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed))
        return value;
    return parsed;
}, z.number().int().positive().optional());
const requiredInteger = z.preprocess((value) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed))
        return value;
    return parsed;
}, z.number().int().positive());
const requiredDateString = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida no formato YYYY-MM-DD.");
export const doacaoPlanejadaInputSchema = z
    .object({
    beneficiario_id: optionalInteger,
    vinculo_familiar_id: optionalInteger,
    item_id: requiredInteger,
    quantidade: z.preprocess((value) => Number(value), z.number().int().min(1)),
    data_prevista: requiredDateString,
    prioridade: z.string().trim().min(2, "Informe a prioridade."),
    status: z.string().trim().min(2, "Informe o status."),
    observacoes: optionalTrimmedString,
    motivo_cancelamento: optionalTrimmedString
})
    .superRefine((value, context) => {
    if (!value.beneficiario_id && !value.vinculo_familiar_id) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Informe o beneficiário ou o vínculo familiar da doação planejada.",
            path: ["beneficiario_id"]
        });
    }
});
export const doacaoPlanejadaFiltersSchema = z.object({
    beneficiario_id: optionalTrimmedString,
    vinculo_familiar_id: optionalTrimmedString,
    status: optionalTrimmedString,
    data_inicial: optionalTrimmedString,
    data_final: optionalTrimmedString
});
