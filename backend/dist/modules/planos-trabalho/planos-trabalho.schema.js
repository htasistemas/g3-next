import { z } from "zod";
import { normalizarCep, normalizarCnpj, normalizarCpf, normalizarEmail, normalizarTelefone, validarCnpj, validarCpf, validarEmail } from "../../utils/br-utils.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const requiredTrimmedString = (message, min = 2) => z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(min, message));
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const requiredIsoDate = (message) => z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message));
const optionalDecimal = z.preprocess((value) => {
    if (value == null || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        const normalized = Number(trimmed.replace(/\./g, "").replace(",", "."));
        return Number.isFinite(normalized) ? normalized : value;
    }
    return value;
}, z.number().finite().nonnegative().optional());
function exibirData(data) {
    const [ano, mes, dia] = data.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}
const optionalInteger = z.preprocess((value) => {
    if (value == null || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
}, z.number().int().nonnegative().optional());
const optionalBoolean = z.preprocess((value) => {
    if (typeof value === "boolean")
        return value;
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    return value;
}, z.boolean().optional());
const cnpjSchema = z
    .string()
    .trim()
    .transform((value) => normalizarCnpj(value))
    .refine((value) => validarCnpj(value), "Informe um CNPJ válido.");
const cpfSchema = z
    .string()
    .trim()
    .transform((value) => normalizarCpf(value))
    .refine((value) => validarCpf(value), "Informe um CPF válido.");
const optionalCpfSchema = z.preprocess((value) => (typeof value === "string" && !value.trim() ? undefined : value), cpfSchema.optional().nullable());
const optionalCnpjSchema = z.preprocess((value) => (typeof value === "string" && !value.trim() ? undefined : value), cnpjSchema.optional().nullable());
const telefoneSchema = z
    .string()
    .trim()
    .transform((value) => normalizarTelefone(value))
    .refine((value) => !value || value.length === 10 || value.length === 11, "Informe um telefone válido.");
const emailSchema = z
    .string()
    .trim()
    .transform((value) => normalizarEmail(value))
    .refine((value) => validarEmail(value), "Informe um e-mail válido.");
const cepSchema = z
    .string()
    .trim()
    .transform((value) => normalizarCep(value))
    .refine((value) => !value || value.length === 8, "Informe um CEP válido.");
export const planoObjetivoEspecificoInputSchema = z.object({
    id: optionalTrimmedString,
    descricao: requiredTrimmedString("Informe a descrição do objetivo específico."),
    resultadoEsperado: optionalTrimmedString.nullable().optional(),
    metasVinculadas: z.array(z.string().trim().min(1)).default([])
});
export const planoMetaEtapaInputSchema = z.object({
    id: optionalTrimmedString,
    nome: requiredTrimmedString("Informe o nome da etapa ou fase."),
    acaoExecutar: optionalTrimmedString.nullable().optional(),
    descricaoDetalhada: optionalTrimmedString.nullable().optional(),
    publicoAtendido: optionalTrimmedString.nullable().optional(),
    quantidade: optionalDecimal.nullable().optional(),
    unidade: optionalTrimmedString.nullable().optional(),
    local: optionalTrimmedString.nullable().optional(),
    dataInicio: optionalIsoDate.nullable().optional(),
    dataFim: optionalIsoDate.nullable().optional(),
    valorEstimado: optionalDecimal.nullable().optional(),
    documentoComprobatorioEsperado: optionalTrimmedString.nullable().optional(),
    responsavel: optionalTrimmedString.nullable().optional(),
    situacao: optionalTrimmedString.nullable().optional()
});
export const planoMetaInputSchema = z.object({
    id: optionalTrimmedString,
    numeroMeta: requiredTrimmedString("Informe o número da meta.", 1),
    descricao: requiredTrimmedString("Informe a descrição da meta."),
    indicadorResultado: optionalTrimmedString.nullable().optional(),
    unidadeMedida: optionalTrimmedString.nullable().optional(),
    quantidadePrevista: optionalDecimal.nullable().optional(),
    meioVerificacao: optionalTrimmedString.nullable().optional(),
    dataInicio: optionalIsoDate.nullable().optional(),
    dataFim: optionalIsoDate.nullable().optional(),
    responsavel: optionalTrimmedString.nullable().optional(),
    situacao: optionalTrimmedString.nullable().optional(),
    etapas: z.array(planoMetaEtapaInputSchema).default([])
});
export const planoAplicacaoRecursoInputSchema = z.object({
    id: optionalTrimmedString,
    categoriaDespesa: requiredTrimmedString("Informe a categoria da despesa."),
    item: requiredTrimmedString("Informe o item da despesa."),
    descricao: optionalTrimmedString.nullable().optional(),
    quantidade: optionalDecimal.nullable().optional(),
    unidade: optionalTrimmedString.nullable().optional(),
    valorUnitario: optionalDecimal.nullable().optional(),
    valorTotal: optionalDecimal.nullable().optional(),
    fonteRecurso: optionalTrimmedString.nullable().optional(),
    metaNumero: optionalTrimmedString.nullable().optional(),
    etapaNome: optionalTrimmedString.nullable().optional(),
    naturezaDespesa: optionalTrimmedString.nullable().optional(),
    observacao: optionalTrimmedString.nullable().optional()
});
export const planoDesembolsoInputSchema = z.object({
    id: optionalTrimmedString,
    mesAno: z.string().trim().regex(/^\d{2}\/\d{4}$/, "Informe o mês/ano no formato MM/AAAA."),
    valorPrevisto: optionalDecimal.nullable().optional(),
    fonteRecurso: optionalTrimmedString.nullable().optional(),
    metaNumero: optionalTrimmedString.nullable().optional(),
    observacao: optionalTrimmedString.nullable().optional()
});
export const planoChecklistPrestacaoInputSchema = z.object({
    id: optionalTrimmedString,
    descricao: requiredTrimmedString("Informe a descrição do checklist."),
    obrigatorio: optionalBoolean.default(true),
    concluido: optionalBoolean.default(false)
});
export const planoTrabalhoInputSchema = z
    .object({
    id: optionalTrimmedString,
    codigoInterno: optionalTrimmedString.nullable().optional(),
    titulo: optionalTrimmedString,
    tipoParceria: optionalTrimmedString,
    orgaoParceiro: optionalTrimmedString,
    editalChamamento: optionalTrimmedString.nullable().optional(),
    periodoInicio: optionalIsoDate,
    periodoFim: optionalIsoDate,
    status: requiredTrimmedString("Informe a situação do plano.", 1),
    responsavelTecnico: optionalTrimmedString,
    responsavelLegal: optionalTrimmedString,
    termoFomentoId: optionalTrimmedString.nullable().optional(),
    numeroProcesso: optionalTrimmedString.nullable().optional(),
    razaoSocial: optionalTrimmedString,
    nomeFantasia: optionalTrimmedString.nullable().optional(),
    cnpj: optionalCnpjSchema,
    cep: cepSchema.optional().nullable(),
    logradouro: optionalTrimmedString.nullable().optional(),
    numero: optionalTrimmedString.nullable().optional(),
    complemento: optionalTrimmedString.nullable().optional(),
    bairro: optionalTrimmedString.nullable().optional(),
    cidade: optionalTrimmedString.nullable().optional(),
    uf: z.preprocess((value) => (typeof value === "string" ? value.trim().toUpperCase() : value), z.string().length(2, "Informe a UF com 2 letras.").optional()).nullable().optional(),
    telefone: telefoneSchema.optional().nullable(),
    email: emailSchema.optional().nullable(),
    representanteLegal: optionalTrimmedString,
    representanteCpf: optionalCpfSchema,
    representanteCargo: optionalTrimmedString.nullable().optional(),
    bancoNome: optionalTrimmedString.nullable().optional(),
    bancoAgencia: optionalTrimmedString.nullable().optional(),
    bancoConta: optionalTrimmedString.nullable().optional(),
    bancoOperacao: optionalTrimmedString.nullable().optional(),
    bancoPix: optionalTrimmedString.nullable().optional(),
    bancoObservacao: optionalTrimmedString.nullable().optional(),
    historicoOsc: optionalTrimmedString.nullable().optional(),
    finalidadeInstitucional: optionalTrimmedString.nullable().optional(),
    experienciaAnterior: optionalTrimmedString.nullable().optional(),
    conselhosCertificacoes: optionalTrimmedString.nullable().optional(),
    publicoAtendidoAtual: optionalTrimmedString.nullable().optional(),
    capacidadeTecnicaOperacional: optionalTrimmedString.nullable().optional(),
    descricaoObjeto: optionalTrimmedString,
    areaAtuacao: optionalTrimmedString,
    localExecucao: optionalTrimmedString,
    abrangenciaTerritorial: optionalTrimmedString.nullable().optional(),
    publicoAlvo: optionalTrimmedString,
    quantidadeBeneficiarios: optionalInteger.nullable().optional(),
    criteriosSelecao: optionalTrimmedString.nullable().optional(),
    problemaSocial: optionalTrimmedString,
    causasConsequencias: optionalTrimmedString.nullable().optional(),
    dadosIndicadores: optionalTrimmedString.nullable().optional(),
    capacidadeExecucao: optionalTrimmedString.nullable().optional(),
    impactoEsperado: optionalTrimmedString.nullable().optional(),
    objetivoGeral: optionalTrimmedString,
    objetivosEspecificos: z.array(planoObjetivoEspecificoInputSchema).default([]),
    metas: z.array(planoMetaInputSchema).default([]),
    aplicacaoRecursos: z.array(planoAplicacaoRecursoInputSchema).default([]),
    desembolso: z.array(planoDesembolsoInputSchema).default([]),
    formaAcompanhamento: optionalTrimmedString.nullable().optional(),
    indicadoresMonitoramento: optionalTrimmedString.nullable().optional(),
    periodicidadeMonitoramento: optionalTrimmedString.nullable().optional(),
    responsavelColetaDados: optionalTrimmedString.nullable().optional(),
    instrumentosMonitoramento: z.array(z.string().trim().min(1)).default([]),
    resultadoEsperadoMonitoramento: optionalTrimmedString.nullable().optional(),
    evidenciasObrigatorias: optionalTrimmedString.nullable().optional(),
    periodicidadePrestacao: optionalTrimmedString.nullable().optional(),
    dataLimitePrestacao: optionalIsoDate.nullable().optional(),
    documentosExigidos: optionalTrimmedString.nullable().optional(),
    responsavelPrestacao: optionalTrimmedString.nullable().optional(),
    observacoesPrestacao: optionalTrimmedString.nullable().optional(),
    checklistPrestacao: z.array(planoChecklistPrestacaoInputSchema).default([]),
    localDeclaracao: optionalTrimmedString.nullable().optional(),
    dataDeclaracao: optionalIsoDate.nullable().optional(),
    nomeRepresentanteDeclaracao: optionalTrimmedString.nullable().optional(),
    cpfRepresentanteDeclaracao: optionalCpfSchema,
    cargoRepresentanteDeclaracao: optionalTrimmedString.nullable().optional(),
    declaracaoVeracidade: optionalBoolean.default(false),
    aprovacaoInterna: optionalTrimmedString.nullable().optional(),
    situacaoAprovacao: optionalTrimmedString.nullable().optional(),
    observacaoAprovador: optionalTrimmedString.nullable().optional(),
    arquivoFormato: optionalTrimmedString.nullable().optional()
})
    .superRefine((input, ctx) => {
    if (input.status !== "RASCUNHO") {
        const obrigatorios = [
            ["titulo", "Informe o título do plano."],
            ["tipoParceria", "Informe o tipo da parceria."],
            ["orgaoParceiro", "Informe o órgão concedente ou parceiro."],
            ["periodoInicio", "Informe a data inicial do período."],
            ["periodoFim", "Informe a data final do período."],
            ["responsavelTecnico", "Informe o responsável técnico."],
            ["responsavelLegal", "Informe o responsável legal."],
            ["razaoSocial", "Informe a razão social."],
            ["cnpj", "Informe um CNPJ válido."],
            ["representanteLegal", "Informe o representante legal."],
            ["representanteCpf", "Informe um CPF válido."],
            ["descricaoObjeto", "Informe o objeto do plano."],
            ["areaAtuacao", "Informe a área de atuação."],
            ["localExecucao", "Informe o local de execução."],
            ["publicoAlvo", "Informe o público-alvo."],
            ["problemaSocial", "Informe o problema social que será enfrentado."],
            ["objetivoGeral", "Informe o objetivo geral."]
        ];
        obrigatorios.forEach(([campo, mensagem]) => {
            if (input[campo] == null || input[campo] === "") {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: mensagem });
            }
        });
    }
    if (input.periodoFim && input.periodoInicio && input.periodoFim < input.periodoInicio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["periodoFim"],
            message: "A data final não pode ser menor que a data inicial."
        });
    }
    input.metas.forEach((meta, index) => {
        if (meta.dataInicio && input.periodoInicio && meta.dataInicio < input.periodoInicio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["metas", index, "dataInicio"],
                message: `A meta deve iniciar entre ${exibirData(input.periodoInicio)} e ${exibirData(input.periodoFim ?? input.periodoInicio)}.`
            });
        }
        if (meta.dataFim && input.periodoFim && meta.dataFim > input.periodoFim) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["metas", index, "dataFim"],
                message: `A meta deve terminar entre ${exibirData(input.periodoInicio ?? input.periodoFim)} e ${exibirData(input.periodoFim)}.`
            });
        }
        if (meta.dataInicio && meta.dataFim && meta.dataFim < meta.dataInicio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["metas", index, "dataFim"],
                message: "A data final da meta não pode ser menor que a data inicial."
            });
        }
        meta.etapas.forEach((etapa, etapaIndex) => {
            if (etapa.dataInicio && input.periodoInicio && etapa.dataInicio < input.periodoInicio) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["metas", index, "etapas", etapaIndex, "dataInicio"],
                    message: `A etapa deve iniciar entre ${exibirData(input.periodoInicio)} e ${exibirData(input.periodoFim ?? input.periodoInicio)}.`
                });
            }
            if (etapa.dataFim && input.periodoFim && etapa.dataFim > input.periodoFim) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["metas", index, "etapas", etapaIndex, "dataFim"],
                    message: `A etapa deve terminar entre ${exibirData(input.periodoInicio ?? input.periodoFim)} e ${exibirData(input.periodoFim)}.`
                });
            }
            if (etapa.dataInicio && etapa.dataFim && etapa.dataFim < etapa.dataInicio) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["metas", index, "etapas", etapaIndex, "dataFim"],
                    message: "A data final da etapa não pode ser menor que a data inicial."
                });
            }
        });
    });
});
