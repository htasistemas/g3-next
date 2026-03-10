import { z } from "zod";
import { mensagemCanalEnvioValues, mensagemCanalPermitidoValues, mensagemDestinatarioValues, mensagemHistoricoStatusValues, mensagemStatusValues, mensagemTaxonomiaTipoValues, mensagemTipoEnvioValues } from "./mensagens-personalizadas.types.js";
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
const optionalArrayOfStrings = z.preprocess((value) => {
    if (!Array.isArray(value))
        return [];
    return value;
}, z.array(z.string().trim().min(1)).default([]));
export const mensagemTaxonomiaInputSchema = z.object({
    tipo: z.enum(mensagemTaxonomiaTipoValues),
    nome: z.string().trim().min(2, "Informe o nome."),
    descricao: optionalTrimmedString.nullable().optional(),
    status: z.enum(mensagemStatusValues).optional()
});
export const mensagemModeloInputSchema = z.object({
    titulo: z.string().trim().min(3, "Informe o título."),
    assunto: optionalTrimmedString.nullable().optional(),
    categoriaId: optionalTrimmedString.nullable().optional(),
    assuntoId: optionalTrimmedString.nullable().optional(),
    tipoComunicacaoId: optionalTrimmedString.nullable().optional(),
    tags: optionalArrayOfStrings,
    tiposDestinatario: z
        .array(z.enum(mensagemDestinatarioValues))
        .min(1, "Selecione ao menos um tipo de destinatário."),
    canalPermitido: z.enum(mensagemCanalPermitidoValues),
    mensagemBase: z.string().trim().min(5, "Informe a mensagem base."),
    variaveisPermitidas: optionalArrayOfStrings,
    status: z.enum(mensagemStatusValues).optional(),
    observacoesInternas: optionalTrimmedString.nullable().optional(),
    mensagemPadraoSistema: z.boolean().optional(),
    mensagemPersonalizadaUsuario: z.boolean().optional(),
    mensagemSugeridaIa: z.boolean().optional()
});
export const mensagemPreviewInputSchema = z.object({
    modeloId: optionalTrimmedString.nullable().optional(),
    canal: z.enum(mensagemCanalEnvioValues),
    destinatarioTipo: z.enum(mensagemDestinatarioValues),
    destinatarioId: z.string().trim().min(1, "Informe o destinatário."),
    assuntoEditado: optionalTrimmedString.nullable().optional(),
    mensagemEditada: optionalTrimmedString.nullable().optional(),
    contextoExtra: z.record(z.unknown()).optional()
});
export const mensagemEnvioInputSchema = z.object({
    modeloId: optionalTrimmedString.nullable().optional(),
    canal: z.enum(mensagemCanalEnvioValues),
    destinatarioTipo: z.enum(mensagemDestinatarioValues),
    destinatarioIds: z.array(z.string().trim().min(1)).min(1, "Selecione ao menos um destinatário."),
    tipoEnvio: z.enum(mensagemTipoEnvioValues),
    assuntoEditado: optionalTrimmedString.nullable().optional(),
    mensagemEditada: optionalTrimmedString.nullable().optional(),
    contextoExtra: z.record(z.unknown()).optional()
});
export const mensagemModeloFiltrosSchema = z.object({
    busca: optionalTrimmedString.optional(),
    status: z.enum(mensagemStatusValues).optional(),
    destinatario: z.enum(mensagemDestinatarioValues).optional(),
    canal: z.enum(mensagemCanalEnvioValues).optional(),
    categoriaId: optionalTrimmedString.optional(),
    somenteIa: z.coerce.boolean().optional(),
    somenteAtivas: z.coerce.boolean().optional()
});
export const mensagemHistoricoFiltrosSchema = z.object({
    busca: optionalTrimmedString.optional(),
    canal: z.enum(mensagemCanalEnvioValues).optional(),
    destinatarioTipo: z.enum(mensagemDestinatarioValues).optional(),
    usuario: optionalTrimmedString.optional(),
    status: z.enum(mensagemHistoricoStatusValues).optional(),
    dataInicio: optionalIsoDate.optional(),
    dataFim: optionalIsoDate.optional()
});
export const mensagemDestinatarioBuscaSchema = z.object({
    tipo: z.enum(mensagemDestinatarioValues),
    termo: optionalTrimmedString.optional(),
    somenteAtivos: z.coerce.boolean().optional()
});
