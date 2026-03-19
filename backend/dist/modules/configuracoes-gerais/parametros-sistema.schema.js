import { z } from "zod";
const corHexRegex = /^#[0-9a-fA-F]{6}$/;
const corHex = z
    .string()
    .trim()
    .regex(corHexRegex, "Informe uma cor no formato #RRGGBB.");
export const temaModoSchema = z.enum(["CLARO", "ESCURO", "AUTOMATICO"]);
export const paletaTemaSchema = z.object({
    cor_primaria: corHex,
    cor_secundaria: corHex,
    cor_destaque: corHex,
    cor_botao_primario: corHex,
    cor_link: corHex,
    cor_elemento_ativo: corHex,
    background: corHex,
    foreground: corHex,
    border: corHex,
    muted: corHex,
    card: corHex,
    danger: corHex,
    warning: corHex,
    success: corHex,
    info: corHex
});
export const personalizacaoSistemaSchema = z.object({
    modo: temaModoSchema,
    preset: z.string().trim().max(80).optional(),
    paleta: paletaTemaSchema
});
export const atualizarPersonalizacaoPayloadSchema = z.object({
    personalizacao: personalizacaoSistemaSchema
});
export const carenciaDoacaoRealizadaSchema = z.object({
    tempo_carencia_dias: z.preprocess((value) => {
        if (value === null || value === undefined || value === "")
            return 0;
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return Number(value);
        return value;
    }, z.number().int().min(0, "Informe um numero de dias valido.").max(3650, "Informe um numero de dias valido."))
});
export const atualizarCarenciaDoacaoRealizadaPayloadSchema = z.object({
    carencia: carenciaDoacaoRealizadaSchema
});
