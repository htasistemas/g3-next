import { z } from "zod";
import { familiaStatusValues } from "./familia.types.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
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
}, z.number().int().nonnegative().optional());
const optionalId = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().positive().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
export const familiaMembroInputSchema = z.object({
    id_familia_membro: optionalId,
    id_beneficiario: z.preprocess((value) => {
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return Number(value);
        return value;
    }, z.number().int().positive("id_beneficiario e obrigatorio.")),
    parentesco: z.string().trim().min(1, "Parentesco e obrigatorio.").max(120),
    responsavel_familiar: optionalBoolean,
    contribui_renda: optionalBoolean,
    renda_individual: optionalTrimmedString,
    participa_servicos: optionalBoolean,
    observacoes: optionalTrimmedString,
    usa_endereco_familia: optionalBoolean
});
export const familiaInputSchema = z
    .object({
    nome_familia: z.string().trim().min(3, "Informe o nome da familia."),
    id_referencia_familiar: optionalId,
    status: z.enum(familiaStatusValues).default("ATIVO"),
    cep: optionalTrimmedString,
    logradouro: optionalTrimmedString,
    numero: optionalTrimmedString,
    complemento: optionalTrimmedString,
    bairro: optionalTrimmedString,
    ponto_referencia: optionalTrimmedString,
    municipio: optionalTrimmedString,
    uf: optionalTrimmedString,
    zona: optionalTrimmedString,
    situacao_imovel: optionalTrimmedString,
    tipo_moradia: optionalTrimmedString,
    agua_encanada: optionalBoolean,
    esgoto_tipo: optionalTrimmedString,
    coleta_lixo: optionalTrimmedString,
    energia_eletrica: optionalBoolean,
    internet: optionalBoolean,
    arranjo_familiar: optionalTrimmedString,
    qtd_membros: optionalInteger,
    qtd_criancas: optionalInteger,
    qtd_adolescentes: optionalInteger,
    qtd_idosos: optionalInteger,
    qtd_pessoas_deficiencia: optionalInteger,
    renda_familiar_total: optionalTrimmedString,
    renda_per_capita: optionalTrimmedString,
    faixa_renda_per_capita: optionalTrimmedString,
    principais_fontes_renda: optionalTrimmedString,
    situacao_inseguranca_alimentar: optionalTrimmedString,
    possui_dividas_relevantes: optionalBoolean,
    descricao_dividas: optionalTrimmedString,
    vulnerabilidades_familia: optionalTrimmedString,
    servicos_acompanhamento: optionalTrimmedString,
    tecnico_responsavel: optionalTrimmedString,
    periodicidade_atendimento: optionalTrimmedString,
    proxima_visita_prevista: optionalIsoDate,
    observacoes: optionalTrimmedString,
    membros: z.array(familiaMembroInputSchema).optional()
})
    .superRefine((value, ctx) => {
    const membros = value.membros ?? [];
    const ids = new Set();
    let responsaveis = 0;
    for (const [index, membro] of membros.entries()) {
        if (ids.has(membro.id_beneficiario)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nao e permitido repetir o mesmo beneficiario na familia.",
                path: ["membros", index, "id_beneficiario"]
            });
        }
        ids.add(membro.id_beneficiario);
        if (membro.responsavel_familiar) {
            responsaveis += 1;
        }
    }
    if (responsaveis > 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A familia pode ter apenas um responsavel familiar.",
            path: ["membros"]
        });
    }
});
export const familiaFiltersSchema = z.object({
    nome_familia: optionalTrimmedString,
    municipio: optionalTrimmedString,
    referencia: optionalTrimmedString,
    status: optionalTrimmedString
});
