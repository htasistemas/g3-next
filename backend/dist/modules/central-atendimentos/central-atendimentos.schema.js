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
        if (value === "true")
            return true;
        if (value === "false")
            return false;
    }
    return value;
}, z.boolean().optional());
const optionalNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value.replace(",", "."));
    return value;
}, z.number().nonnegative().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    if (!trimmed)
        return undefined;
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
export const centralAtendimentosBuscaFiltersSchema = z.object({
    busca: optionalTrimmedString,
    bairro: optionalTrimmedString,
    situacao_cadastral: optionalTrimmedString,
    faixa_etaria: optionalTrimmedString,
    sexo: optionalTrimmedString,
    familia_vinculada: optionalBoolean,
    ultimo_atendimento: optionalTrimmedString,
    com_beneficio_no_mes: optionalBoolean,
    sem_atendimento_recente: optionalBoolean
});
export const centralAtendimentoInputSchema = z.object({
    data_hora: z.string().trim().min(10, "Informe a data e hora."),
    tipo_atendimento: z.string().trim().min(2, "Informe o tipo de atendimento."),
    setor: z.string().trim().min(2, "Informe o setor."),
    profissional_responsavel: z.string().trim().min(2, "Informe o profissional responsável."),
    prioridade: optionalTrimmedString,
    status: optionalTrimmedString,
    classificacao: optionalTrimmedString,
    necessidade_identificada: optionalTrimmedString,
    resumo: z.string().trim().min(3, "Informe o resumo do atendimento."),
    observacoes: optionalTrimmedString,
    retorno_previsto: optionalIsoDate
});
export const centralBeneficioInputSchema = z.object({
    data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    tipo: z.string().trim().min(2, "Informe o tipo de benefício."),
    item: z.string().trim().min(2, "Informe o item."),
    quantidade: optionalNumber,
    valor_unitario: optionalNumber,
    valor_total: optionalNumber,
    origem_recurso: optionalTrimmedString,
    projeto_programa: optionalTrimmedString,
    profissional_responsavel: z.string().trim().min(2, "Informe o profissional responsável."),
    observacoes: optionalTrimmedString,
    ciente_alertas: optionalBoolean
});
export const centralEncaminhamentoInputSchema = z.object({
    data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    tipo: z.string().trim().min(2, "Informe o tipo de encaminhamento."),
    destino: z.string().trim().min(2, "Informe o destino."),
    profissional: z.string().trim().min(2, "Informe o profissional."),
    motivo: z.string().trim().min(3, "Informe o motivo."),
    retorno_esperado: optionalIsoDate,
    status: optionalTrimmedString,
    observacoes: optionalTrimmedString
});
