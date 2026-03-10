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
export const bibliotecaLivroInputSchema = z.object({
    codigo: z.string().trim().min(1, "Informe o codigo."),
    titulo: z.string().trim().min(2, "Informe o titulo."),
    autor: z.string().trim().min(2, "Informe o autor."),
    isbn: optionalTrimmedString.nullable().optional(),
    editora: optionalTrimmedString.nullable().optional(),
    anoPublicacao: z.coerce.number().int().min(0).max(9999).nullable().optional(),
    categoria: optionalTrimmedString.nullable().optional(),
    quantidadeTotal: z.coerce.number().int().nonnegative(),
    quantidadeDisponivel: z.coerce.number().int().nonnegative(),
    localizacao: optionalTrimmedString.nullable().optional(),
    status: z.enum(["ATIVO", "INATIVO"]),
    estadoLivro: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional()
});
export const bibliotecaEmprestimoInputSchema = z.object({
    livroId: z.string().trim().min(1, "Informe o livro."),
    beneficiarioId: optionalTrimmedString.nullable().optional(),
    beneficiarioNome: optionalTrimmedString.nullable().optional(),
    responsavelId: optionalTrimmedString.nullable().optional(),
    responsavelNome: optionalTrimmedString.nullable().optional(),
    dataEmprestimo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    dataDevolucaoPrevista: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    dataDevolucaoReal: optionalIsoDate.nullable().optional(),
    status: z.enum(["ATIVO", "DEVOLVIDO", "ATRASADO", "CANCELADO"]).optional(),
    observacoes: optionalTrimmedString.nullable().optional()
});
