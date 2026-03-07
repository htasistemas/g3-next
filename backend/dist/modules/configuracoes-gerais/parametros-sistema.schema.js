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
