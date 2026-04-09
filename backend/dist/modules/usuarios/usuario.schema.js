import { z } from "zod";
import { isValidCpf, isValidPhone } from "../../utils/validators.js";
import { usuarioOrigemTipoValues, usuarioStatusValues } from "./usuario.types.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalBoolean = z.preprocess((value) => {
    if (typeof value === "boolean")
        return value;
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    if (value === null || value === undefined || value === "")
        return undefined;
    return value;
}, z.boolean().optional());
const optionalInteger = z.preprocess((value) => {
    if (typeof value === "number")
        return value;
    if (typeof value === "string" && value.trim().length)
        return Number(value);
    if (value === null || value === undefined || value === "")
        return undefined;
    return value;
}, z.number().int().positive().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalUsuarioStatus = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed.toUpperCase() : undefined;
}, z.enum(usuarioStatusValues).optional());
const optionalUsuarioOrigemTipo = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed.toUpperCase() : undefined;
}, z.enum(usuarioOrigemTipoValues).optional());
const optionalPermissoesArray = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (Array.isArray(value))
        return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        return trimmed
            .split(/[;,]/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return value;
}, z.array(z.string().trim().min(1)).optional());
const baseUsuarioSchemaShape = {
    nome_completo: z.string().trim().min(3, "Informe o nome completo."),
    nome_exibicao: optionalTrimmedString,
    nome_usuario: z.string().trim().min(3, "Informe o login do usuario."),
    email: z.string().trim().email("Informe um e-mail valido."),
    telefone: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidPhone(value), "Informe um telefone valido."),
    cpf: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidCpf(value), "Informe um CPF valido."),
    matricula: optionalTrimmedString,
    setor: optionalTrimmedString,
    unidade: optionalTrimmedString,
    cargo: optionalTrimmedString,
    perfil_acesso: optionalTrimmedString,
    permissoes: optionalPermissoesArray,
    status: z.enum(usuarioStatusValues).default("ATIVO"),
    exigir_troca_senha: optionalBoolean.default(false),
    origem_tipo: optionalUsuarioOrigemTipo,
    origem_id: optionalTrimmedString,
    origem_nome: optionalTrimmedString
};
const baseUsuarioSchema = z.object(baseUsuarioSchemaShape).superRefine((input, context) => {
    if (input.origem_tipo && !input.origem_id) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["origem_id"],
            message: "Informe a origem vinculada do usuario."
        });
    }
});
export const criarUsuarioSchema = z
    .object({
    ...baseUsuarioSchemaShape,
    senha: z.string().min(6, "A senha deve ter no minimo 6 caracteres."),
    confirmar_senha: z.string().min(6, "Confirme a senha.")
})
    .superRefine((input, context) => {
    if (input.origem_tipo && !input.origem_id) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["origem_id"],
            message: "Informe a origem vinculada do usuario."
        });
    }
    if (input.senha !== input.confirmar_senha) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmar_senha"],
            message: "As senhas nao conferem."
        });
    }
});
export const atualizarUsuarioSchema = baseUsuarioSchema;
export const atualizarStatusUsuarioSchema = z.object({
    status: z.enum(usuarioStatusValues)
});
export const resetarSenhaUsuarioSchema = z
    .object({
    nova_senha: z.string().min(6, "A nova senha deve ter no minimo 6 caracteres."),
    confirmar_nova_senha: z.string().min(6, "Confirme a nova senha."),
    exigir_troca_senha: optionalBoolean.default(true)
})
    .superRefine((input, context) => {
    if (input.nova_senha !== input.confirmar_nova_senha) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["confirmar_nova_senha"],
            message: "As senhas nao conferem."
        });
    }
});
export const usuarioFiltersSchema = z.object({
    nome: optionalTrimmedString,
    login: optionalTrimmedString,
    email: optionalTrimmedString,
    perfil: optionalTrimmedString,
    setor: optionalTrimmedString,
    unidade: optionalTrimmedString,
    status: optionalUsuarioStatus,
    criado_de: optionalIsoDate,
    criado_ate: optionalIsoDate,
    pagina: optionalInteger.default(1),
    tamanho_pagina: optionalInteger.default(20)
});
