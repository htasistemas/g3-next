import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalEmail = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().email("Informe um email valido.").optional());
const optionalSubject = optionalTrimmedString.refine((value) => !value || !/[\r\n]/.test(value), "Assunto invalido.");
export const emailTesteRequestSchema = z
    .object({
    destinatario: optionalEmail,
    assunto: optionalSubject,
    mensagem: optionalTrimmedString
})
    .default({});
