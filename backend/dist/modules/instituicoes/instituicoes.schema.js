import { z } from "zod";
import { normalizarCnpj } from "../../utils/br-utils.js";
import { instituicaoPlanoValues, instituicaoStatusValues } from "./instituicoes.types.js";
const adminInicialSchema = z.object({
    nome: z.string().trim().min(3, "Informe o nome do administrador inicial."),
    nome_usuario: z.string().trim().min(3, "Informe o login inicial."),
    email: z.string().trim().email("Informe um e-mail válido."),
    senha: z.string().min(8, "A senha inicial deve ter ao menos 8 caracteres.")
});
export const instituicaoCreateSchema = z.object({
    cnpj: z
        .string()
        .trim()
        .transform((value) => normalizarCnpj(value) ?? "")
        .refine((value) => value.length === 14, "Informe um CNPJ válido."),
    razao_social: z.string().trim().min(3, "Informe a razão social."),
    nome_fantasia: z.string().trim().optional(),
    slug: z.string().trim().min(3, "Informe o slug da instituição."),
    codigo: z.string().trim().optional(),
    email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
    telefone: z.string().trim().optional(),
    endereco: z.string().trim().optional(),
    plano: z.enum(instituicaoPlanoValues),
    status: z.enum(instituicaoStatusValues).default("ativo"),
    logo_url: z.string().trim().optional(),
    cor_tema: z.string().trim().optional(),
    admin_inicial: adminInicialSchema.optional()
});
export const instituicaoUpdateSchema = instituicaoCreateSchema.partial();
export const instituicaoResetAdminSchema = z.object({
    email: z.string().trim().email("Informe um e-mail válido.").optional(),
    nova_senha: z.string().min(8, "A nova senha deve ter ao menos 8 caracteres.")
});
