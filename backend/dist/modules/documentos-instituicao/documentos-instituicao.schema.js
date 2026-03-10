import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalNumberArray = z.preprocess((value) => {
    if (value == null || value === "")
        return undefined;
    if (Array.isArray(value))
        return value;
    if (typeof value === "string") {
        return value
            .split(",")
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isFinite(item));
    }
    return value;
}, z.array(z.number().int().nonnegative()).optional());
export const documentoInstituicaoInputSchema = z.object({
    tipoDocumento: z.string().trim().min(2, "Informe o tipo do documento."),
    orgaoEmissor: z.string().trim().min(2, "Informe o orgao emissor."),
    descricao: optionalTrimmedString.nullable().optional(),
    categoria: optionalTrimmedString.nullable().optional(),
    emissao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    validade: optionalIsoDate.nullable().optional(),
    responsavelInterno: optionalTrimmedString.nullable().optional(),
    modoRenovacao: optionalTrimmedString.nullable().optional(),
    observacaoRenovacao: optionalTrimmedString.nullable().optional(),
    gerarAlerta: z.boolean().optional(),
    diasAntecedencia: optionalNumberArray.nullable().optional(),
    formaAlerta: optionalTrimmedString.nullable().optional(),
    emRenovacao: z.boolean().optional(),
    semVencimento: z.boolean().optional(),
    vencimentoIndeterminado: z.boolean().optional()
});
export const documentoInstituicaoAnexoInputSchema = z.object({
    nomeArquivo: z.string().trim().min(2, "Informe o nome do arquivo."),
    tipo: z.string().trim().min(2, "Informe o tipo do anexo."),
    tipoMime: optionalTrimmedString.nullable().optional(),
    conteudoBase64: z.string().trim().min(8, "Informe o conteudo do anexo."),
    tamanho: optionalTrimmedString.nullable().optional(),
    dataUpload: optionalIsoDate.nullable().optional(),
    usuario: z.string().trim().min(2, "Informe o usuario.")
});
export const documentoInstituicaoHistoricoInputSchema = z.object({
    dataHora: z
        .preprocess((value) => {
        if (typeof value !== "string")
            return value;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    }, z.string().datetime().optional())
        .nullable()
        .optional(),
    usuario: z.string().trim().min(2, "Informe o usuario."),
    tipoAlteracao: z.string().trim().min(2, "Informe o tipo de alteracao."),
    observacao: optionalTrimmedString.nullable().optional()
});
