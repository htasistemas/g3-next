import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalBoolean = z.preprocess((value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true")
            return true;
        if (normalized === "false")
            return false;
    }
    return value;
}, z.boolean().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().positive().optional());
const prioridadeSchema = z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]);
const statusSchema = z.enum(["PENDENTE", "CONCLUIDO", "ATRASADO", "DISPENSADO", "NAO_SE_APLICA"]);
const tipoModeloSchema = z.enum(["INSTITUCIONAL", "SETOR", "FUNCAO", "USUARIO"]);
const optionalTimeString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{2}:\d{2}$/).optional());
export const checklistListagemFiltrosSchema = z.object({
    usuarioId: optionalInteger,
    unidadeId: optionalInteger,
    periodoInicio: optionalTrimmedString,
    periodoFim: optionalTrimmedString,
    status: statusSchema.optional(),
    prioridade: prioridadeSchema.optional(),
    diaSemana: z.coerce.number().int().min(1).max(7).optional(),
    tipoModelo: tipoModeloSchema.optional(),
    somentePendentes: optionalBoolean,
    somenteAtrasados: optionalBoolean,
    termo: optionalTrimmedString
});
export const checklistGerarSemanaSchema = z.object({
    dataReferencia: optionalTrimmedString,
    usuarioId: optionalInteger,
    forcar: optionalBoolean
});
export const checklistExecucaoConclusaoSchema = z.object({
    observacao: optionalTrimmedString
});
export const checklistExecucaoDispensaSchema = z.object({
    motivo: z.string().trim().min(3, "Informe o motivo da dispensa."),
    observacao: optionalTrimmedString
});
export const checklistExecucaoReaberturaSchema = z.object({
    motivo: optionalTrimmedString,
    observacao: optionalTrimmedString
});
export const checklistConfiguracaoSchema = z.object({
    sabadoAtivo: z.boolean(),
    domingoAtivo: z.boolean()
});
export const checklistModeloItemSchema = z.object({
    id: optionalInteger,
    diaSemana: z.coerce.number().int().min(1).max(7),
    titulo: z.string().trim().min(3, "Informe o título da atividade."),
    descricaoDetalhada: optionalTrimmedString,
    horarioPrevisto: optionalTimeString.nullable().optional(),
    prioridade: prioridadeSchema,
    alertaAtivo: optionalBoolean,
    horarioAlerta: optionalTimeString.nullable().optional(),
    observacaoObrigatoria: optionalBoolean,
    atividadeCritica: optionalBoolean,
    ordem: z.coerce.number().int().nonnegative().optional(),
    ativo: optionalBoolean
});
export const checklistModeloSchema = z.object({
    nome: z.string().trim().min(3, "Informe o nome do modelo."),
    descricao: optionalTrimmedString,
    tipo: tipoModeloSchema,
    usuarioId: optionalInteger.nullable().optional(),
    unidadeId: optionalInteger.nullable().optional(),
    setor: optionalTrimmedString,
    cargo: optionalTrimmedString,
    ativo: optionalBoolean,
    itens: z.array(checklistModeloItemSchema).min(1, "Inclua pelo menos uma atividade no modelo.")
});
