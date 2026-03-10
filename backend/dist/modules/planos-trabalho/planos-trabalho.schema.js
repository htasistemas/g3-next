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
export const planoEtapaInputSchema = z.object({
    id: optionalTrimmedString,
    descricao: z.string().trim().min(2, "Informe a descrição da etapa."),
    status: optionalTrimmedString.nullable().optional(),
    dataInicioPrevista: optionalIsoDate.nullable().optional(),
    dataFimPrevista: optionalIsoDate.nullable().optional(),
    dataConclusao: optionalIsoDate.nullable().optional(),
    responsavel: optionalTrimmedString.nullable().optional()
});
export const planoAtividadeInputSchema = z.object({
    id: optionalTrimmedString,
    descricao: z.string().trim().min(2, "Informe a descrição da atividade."),
    justificativa: optionalTrimmedString.nullable().optional(),
    publicoAlvo: optionalTrimmedString.nullable().optional(),
    localExecucao: optionalTrimmedString.nullable().optional(),
    produtoEsperado: optionalTrimmedString.nullable().optional(),
    etapas: z.array(planoEtapaInputSchema)
});
export const planoMetaInputSchema = z.object({
    id: optionalTrimmedString,
    codigo: optionalTrimmedString.nullable().optional(),
    descricao: z.string().trim().min(2, "Informe a descrição da meta."),
    indicador: optionalTrimmedString.nullable().optional(),
    unidadeMedida: optionalTrimmedString.nullable().optional(),
    quantidadePrevista: optionalDecimal.nullable().optional(),
    resultadoEsperado: optionalTrimmedString.nullable().optional(),
    atividades: z.array(planoAtividadeInputSchema)
});
export const planoCronogramaInputSchema = z.object({
    id: optionalTrimmedString,
    referenciaTipo: optionalTrimmedString.nullable().optional(),
    referenciaId: optionalTrimmedString.nullable().optional(),
    referenciaDescricao: optionalTrimmedString.nullable().optional(),
    competencia: z.string().trim().min(1, "Informe a competência."),
    descricaoResumida: optionalTrimmedString.nullable().optional(),
    valorPrevisto: optionalDecimal.nullable().optional(),
    fonteRecurso: optionalTrimmedString.nullable().optional(),
    naturezaDespesa: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional()
});
export const planoEquipeInputSchema = z.object({
    id: optionalTrimmedString,
    nome: z.string().trim().min(2, "Informe o nome da equipe."),
    funcao: optionalTrimmedString.nullable().optional(),
    cpf: optionalTrimmedString.nullable().optional(),
    cargaHoraria: optionalTrimmedString.nullable().optional(),
    tipoVinculo: optionalTrimmedString.nullable().optional(),
    contato: optionalTrimmedString.nullable().optional()
});
export const planoTrabalhoInputSchema = z.object({
    id: optionalTrimmedString,
    codigoInterno: optionalTrimmedString.nullable().optional(),
    titulo: z.string().trim().min(2, "Informe o título."),
    descricaoGeral: z.string().trim().min(2, "Informe a descrição geral."),
    status: z.string().trim().min(2, "Informe o status."),
    orgaoConcedente: optionalTrimmedString.nullable().optional(),
    orgaoOutroDescricao: optionalTrimmedString.nullable().optional(),
    areaPrograma: optionalTrimmedString.nullable().optional(),
    dataElaboracao: optionalIsoDate.nullable().optional(),
    dataAprovacao: optionalIsoDate.nullable().optional(),
    vigenciaInicio: optionalIsoDate.nullable().optional(),
    vigenciaFim: optionalIsoDate.nullable().optional(),
    termoFomentoId: z.string().trim().min(1, "Informe o termo de fomento."),
    numeroProcesso: optionalTrimmedString.nullable().optional(),
    modalidade: optionalTrimmedString.nullable().optional(),
    observacoesVinculacao: optionalTrimmedString.nullable().optional(),
    arquivoFormato: optionalTrimmedString.nullable().optional(),
    metas: z.array(planoMetaInputSchema),
    cronograma: z.array(planoCronogramaInputSchema),
    equipe: z.array(planoEquipeInputSchema)
});
