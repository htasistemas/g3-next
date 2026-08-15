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
const optionalBoolean = z.preprocess((value) => {
    if (value === "" || value === null || value === undefined)
        return undefined;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "sim"].includes(normalized))
            return true;
        if (["false", "0", "nao", "não"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean().optional());
export const projetoPrioridadeSchema = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);
export const projetoStatusSchema = z.enum([
    "NAO_INICIADO",
    "EM_ANDAMENTO",
    "PARADO",
    "CONCLUIDO",
    "CANCELADO"
]);
export const projetoAreaSchema = z.enum([
    "ASSISTENCIA_SOCIAL",
    "EDUCACAO",
    "SAUDE",
    "ALIMENTACAO",
    "CAPACITACAO_PROFISSIONAL",
    "CULTURA",
    "ESPORTE",
    "HABITACAO",
    "CAPTACAO_RECURSOS",
    "OUTRO"
]);
export const projetoTarefaTipoSchema = z.enum([
    "PLANEJAMENTO",
    "EXECUCAO",
    "ATENDIMENTO",
    "COMPRA",
    "PRESTACAO_CONTAS",
    "RELATORIO",
    "REUNIAO",
    "MONITORAMENTO",
    "DIVULGACAO",
    "OUTRO"
]);
export const projetoTarefaStatusSchema = z.enum([
    "NAO_INICIADO",
    "EM_ANDAMENTO",
    "PARADO",
    "CONCLUIDO"
]);
export const projetoInputSchema = z
    .object({
    nome: z.string().trim().min(3, "Informe o nome do projeto."),
    descricao_completa: optionalTrimmedString,
    objetivo_geral: optionalTrimmedString,
    publico_alvo: optionalTrimmedString,
    unidade_assistencial_id: optionalTrimmedString,
    responsavel: z.string().trim().min(2, "Informe o responsável."),
    equipe_envolvida: z.array(z.string().trim().min(1)).optional(),
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início."),
    prazo_previsto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo previsto."),
    data_termino_real: optionalIsoDate,
    prioridade: projetoPrioridadeSchema,
    status: projetoStatusSchema,
    area_projeto: projetoAreaSchema,
    fonte_recurso: optionalTrimmedString,
    observacoes: optionalTrimmedString,
    ativo: z.boolean().optional()
})
    .superRefine((input, ctx) => {
    const dataInicio = new Date(`${input.data_inicio}T00:00:00`);
    const prazo = new Date(`${input.prazo_previsto}T00:00:00`);
    if (prazo < dataInicio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["prazo_previsto"],
            message: "O prazo previsto não pode ser menor que a data de início."
        });
    }
    if (input.data_termino_real) {
        const termino = new Date(`${input.data_termino_real}T00:00:00`);
        if (termino < dataInicio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["data_termino_real"],
                message: "A data de término não pode ser menor que a data de início."
            });
        }
    }
    if (input.status === "CONCLUIDO" && !input.data_termino_real) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data_termino_real"],
            message: "Projeto concluído deve informar a data de conclusão."
        });
    }
});
export const projetoTarefaInputSchema = z
    .object({
    titulo: z.string().trim().min(3, "Informe o título da tarefa."),
    descricao: optionalTrimmedString,
    tipo_tarefa: projetoTarefaTipoSchema,
    responsavel: z.string().trim().min(2, "Informe o responsável da tarefa."),
    prioridade: projetoPrioridadeSchema,
    status: projetoTarefaStatusSchema,
    data_prevista: optionalIsoDate,
    data_conclusao: optionalIsoDate,
    observacoes: optionalTrimmedString,
    ordem_kanban: z.coerce.number().int().nonnegative().optional(),
    ativo: z.boolean().optional()
})
    .superRefine((input, ctx) => {
    if (input.status === "CONCLUIDO" && !input.data_conclusao) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data_conclusao"],
            message: "Tarefa concluída deve informar a data de conclusão."
        });
    }
});
export const projetoFiltersSchema = z.object({
    projeto_id: optionalTrimmedString,
    nome: optionalTrimmedString,
    responsavel: optionalTrimmedString,
    status: projetoStatusSchema.optional(),
    prioridade: projetoPrioridadeSchema.optional(),
    area_projeto: projetoAreaSchema.optional(),
    data_inicio_de: optionalIsoDate,
    data_inicio_ate: optionalIsoDate,
    prazo_de: optionalIsoDate,
    prazo_ate: optionalIsoDate,
    atrasados: optionalBoolean,
    concluidos: optionalBoolean,
    unidade_assistencial_id: optionalTrimmedString,
    ativo: optionalBoolean
});
export const projetoRelatorioSchema = projetoFiltersSchema.extend({
    projeto_id: optionalTrimmedString
});
