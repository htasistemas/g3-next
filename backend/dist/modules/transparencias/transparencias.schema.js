import { z } from "zod";
import { transparenciaTipoPrestacaoValues } from "./transparencias.types.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalDecimal = z.preprocess((value) => {
    if (value == null || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const normalized = Number(value.replace(",", "."));
        return Number.isFinite(normalized) ? normalized : value;
    }
    return value;
}, z.number().finite().optional());
export const transparenciaInputSchema = z.object({
    id: optionalTrimmedString,
    unidadeId: optionalTrimmedString.nullable().optional(),
    instrumento: optionalTrimmedString.nullable().optional(),
    objeto: optionalTrimmedString.nullable().optional(),
    periodoInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data inicial válida.").nullable().optional(),
    periodoFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data final válida.").nullable().optional(),
    tipoPrestacao: z.enum(transparenciaTipoPrestacaoValues).nullable().optional(),
    totalRecebido: optionalDecimal.nullable().optional(),
    totalRecebidoHelper: optionalTrimmedString.nullable().optional(),
    totalAplicado: optionalDecimal.nullable().optional(),
    totalAplicadoHelper: optionalTrimmedString.nullable().optional(),
    saldoDisponivel: optionalDecimal.nullable().optional(),
    saldoDisponivelHelper: optionalTrimmedString.nullable().optional(),
    prestadoMes: optionalDecimal.nullable().optional(),
    prestadoMesHelper: optionalTrimmedString.nullable().optional(),
    parecerConclusao: z.enum(["APROVAR", "APROVAR_RESSALVAS", "REJEITAR"]).nullable().optional(),
    parecerTexto: optionalTrimmedString.nullable().optional(),
    parecerRessalvas: optionalTrimmedString.nullable().optional(),
    parecerRecomendacoes: optionalTrimmedString.nullable().optional(),
    parecerResponsavel: optionalTrimmedString.nullable().optional(),
    parecerData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de parecer válida.").nullable().optional(),
    recebimentos: z.array(z.object({
        id: optionalTrimmedString,
        fonte: z.string().trim().min(2, "Informe a fonte."),
        valor: optionalDecimal.nullable().optional(),
        periodicidade: optionalTrimmedString.nullable().optional(),
        status: optionalTrimmedString.nullable().optional()
    })),
    destinacoes: z.array(z.object({
        id: optionalTrimmedString,
        titulo: z.string().trim().min(2, "Informe o título."),
        descricao: optionalTrimmedString.nullable().optional(),
        percentual: optionalDecimal.nullable().optional()
    })),
    comprovantes: z.array(z.object({
        id: optionalTrimmedString,
        titulo: z.string().trim().min(2, "Informe o título."),
        descricao: optionalTrimmedString.nullable().optional(),
        arquivoNome: optionalTrimmedString.nullable().optional(),
        arquivoUrl: optionalTrimmedString.nullable().optional()
    })),
    timelines: z.array(z.object({
        id: optionalTrimmedString,
        titulo: z.string().trim().min(2, "Informe o título."),
        detalhe: optionalTrimmedString.nullable().optional(),
        status: optionalTrimmedString.nullable().optional()
    })),
    checklist: z.array(z.object({
        id: optionalTrimmedString,
        titulo: z.string().trim().min(2, "Informe o título."),
        descricao: optionalTrimmedString.nullable().optional(),
        status: optionalTrimmedString.nullable().optional()
    })),
    despesas: z.array(z.object({
        id: optionalTrimmedString,
        descricao: z.string().trim().min(2, "Informe a descrição da despesa."),
        fornecedor: optionalTrimmedString.nullable().optional(),
        documentoFiscal: optionalTrimmedString.nullable().optional(),
        dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de pagamento válida.").nullable().optional(),
        categoria: optionalTrimmedString.nullable().optional(),
        valor: optionalDecimal.nullable().optional(),
        status: optionalTrimmedString.nullable().optional()
    }).superRefine((item, context) => {
        if (item.valor != null && item.valor < 0) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "O valor da despesa não pode ser negativo." });
        }
    })).default([])
}).superRefine((value, context) => {
    if (value.periodoInicio && value.periodoFim && value.periodoFim < value.periodoInicio) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["periodoFim"], message: "A data final não pode ser anterior à inicial." });
    }
    for (const [field, label] of [["totalRecebido", "total recebido"], ["totalAplicado", "total aplicado"], ["saldoDisponivel", "saldo disponível"], ["prestadoMes", "valor prestado no mês"]]) {
        const valueField = value[field];
        if (valueField != null && valueField < 0) {
            context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `O ${label} não pode ser negativo.` });
        }
    }
    const totalPercentual = value.destinacoes.reduce((total, item) => total + (item.percentual ?? 0), 0);
    if (totalPercentual > 100.01) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["destinacoes"], message: "A soma das aplicações não pode ultrapassar 100%." });
    }
});
export const transparenciaWorkflowSchema = z.object({
    acao: z.enum(["ENVIAR_ANALISE", "DEVOLVER_DILIGENCIA", "APROVAR", "APROVAR_RESSALVAS", "REJEITAR", "ENCERRAR"])
});
