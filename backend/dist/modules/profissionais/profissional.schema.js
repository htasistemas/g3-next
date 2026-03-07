import { z } from "zod";
import { isValidCep, isValidCpf } from "../../utils/validators.js";
import { profissionalStatusValues } from "./profissional.types.js";
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
}, z.number().int().nonnegative().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalStringArray = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (Array.isArray(value))
        return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        return trimmed.split(/[;,]/g).map((item) => item.trim());
    }
    return value;
}, z.array(z.string().trim().min(1)).optional());
export const profissionalInputSchema = z.object({
    nome_completo: z.string().trim().min(3, "Informe o nome completo."),
    cpf: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidCpf(value), "Informe um CPF valido."),
    nome_social: optionalTrimmedString,
    apelido: optionalTrimmedString,
    data_nascimento: optionalIsoDate,
    foto_3x4: optionalTrimmedString,
    sexo_biologico: optionalTrimmedString,
    identidade_genero: optionalTrimmedString,
    cor_raca: optionalTrimmedString,
    estado_civil: optionalTrimmedString,
    nacionalidade: optionalTrimmedString,
    naturalidade_cidade: optionalTrimmedString,
    naturalidade_uf: optionalTrimmedString,
    nome_mae: optionalTrimmedString,
    nome_pai: optionalTrimmedString,
    vinculo: optionalTrimmedString,
    categoria: z.string().trim().min(2, "Informe a categoria."),
    registro_conselho: optionalTrimmedString,
    especialidade: optionalTrimmedString,
    email: z.union([z.string().trim().email("E-mail invalido."), z.undefined()]).optional(),
    telefone: optionalTrimmedString,
    unidade: optionalTrimmedString,
    sala_atendimento: optionalTrimmedString,
    carga_horaria: optionalInteger,
    disponibilidade: optionalStringArray,
    canais_atendimento: optionalStringArray,
    status: z.enum(profissionalStatusValues).default("EM_ANALISE"),
    tags: optionalStringArray,
    resumo: optionalTrimmedString,
    observacoes: optionalTrimmedString,
    cep: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidCep(value), "Informe um CEP valido."),
    logradouro: optionalTrimmedString,
    numero: optionalTrimmedString,
    complemento: optionalTrimmedString,
    bairro: optionalTrimmedString,
    ponto_referencia: optionalTrimmedString,
    municipio: optionalTrimmedString,
    zona: optionalTrimmedString,
    subzona: optionalTrimmedString,
    uf: optionalTrimmedString
});
export const profissionalFiltersSchema = z.object({
    nome: optionalTrimmedString,
    categoria: optionalTrimmedString,
    status: optionalTrimmedString,
    cpf: optionalTrimmedString,
    vinculo: optionalTrimmedString
});
