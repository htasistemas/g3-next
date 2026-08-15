import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().optional());
export const informacaoAdministrativaSchema = z.object({
    categoria: z.string().trim().min(1, "Informe a categoria.").max(80),
    titulo: z.string().trim().min(1, "Informe o titulo.").max(160),
    descricao: optionalTrimmedString,
    usuarioAcesso: optionalTrimmedString,
    senhaAcesso: optionalTrimmedString,
    link: optionalTrimmedString,
    observacoes: optionalTrimmedString
});
export const senhaConfirmacaoSchema = z.object({
    senhaConfirmacao: z.string().min(1, "Informe a senha para confirmar o acesso.")
});
export const informacaoAdministrativaComSenhaSchema = informacaoAdministrativaSchema.merge(senhaConfirmacaoSchema);
export const informacaoAdministrativaCategoriaSchema = z.object({
    nome: z.string().trim().min(1, "Informe o nome da categoria.").max(80),
    ativo: z.boolean().optional().default(true)
});
export const informacaoAdministrativaCategoriaComSenhaSchema = informacaoAdministrativaCategoriaSchema.merge(senhaConfirmacaoSchema);
