import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
export const ocorrenciaCriancaInputSchema = z
    .object({
    dataPreenchimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    vitimaNome: z.string().trim().min(2, "Informe o nome da vitima."),
    vitimaIdade: z.coerce.number().int().min(0).max(120).nullable(),
    resumoViolencia: z.string().trim().min(3, "Informe o resumo da violencia.")
})
    .catchall(z.unknown());
export const ocorrenciaCriancaAnexoInputSchema = z.object({
    nomeArquivo: z.string().trim().min(2, "Informe o nome do arquivo."),
    tipoMime: z.string().trim().min(3, "Informe o tipo MIME."),
    conteudoBase64: z.string().trim().min(8, "Informe o conteudo base64."),
    ordem: z.coerce.number().int().nonnegative()
});
