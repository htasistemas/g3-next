import { z } from "zod";
import { isValidCpf } from "../../utils/validators.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().nonnegative().optional());
const requiredInteger = z.preprocess((value) => {
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().nonnegative());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    if (!trimmed.length)
        return undefined;
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalHour = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{2}:\d{2}$/).optional());
const optionalIntervalMinutes = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().min(1).max(1440).optional());
const optionalStringArray = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (Array.isArray(value))
        return value;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        return trimmed.split(/[;,]/g).map((item) => item.trim());
    }
    return value;
}, z.array(z.string().trim().min(1)).optional());
const matriculaStatusValues = ["ATIVO", "FINALIZADO", "CANCELADO"];
const presencaStatusValues = ["PRESENTE", "AUSENTE", "JUSTIFICADO", "NAO_INFORMADO"];
const presencaDataStatusValues = ["GERADA", "PREENCHIDA", "CANCELADA"];
export const matriculaInscricaoInputSchema = z.object({
    beneficiario_nome: z.string().trim().min(3, "Informe o nome do beneficiario."),
    cpf: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidCpf(value), "Informe um CPF valido."),
    email: z.string().trim().email("Informe um e-mail valido.").optional(),
    status: optionalTrimmedString,
    data_matricula: optionalIsoDate,
    data_agendada: optionalIsoDate,
    hora_agendada: optionalHour,
    status_agendamento: optionalTrimmedString,
    profissional_id: optionalTrimmedString,
    profissional_nome: optionalTrimmedString,
    profissional_tipo: optionalTrimmedString,
    confirmacao_presenca: z.boolean().optional()
});
export const matriculaFilaEsperaInputSchema = z.object({
    beneficiario_nome: z.string().trim().min(3, "Informe o nome do beneficiario."),
    cpf: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || isValidCpf(value), "Informe um CPF valido."),
    data_entrada: optionalIsoDate
});
export const matriculaInputSchema = z.object({
    tipo: z.string().trim().min(3, "Informe o tipo."),
    nome: z.string().trim().min(3, "Informe o nome."),
    descricao: optionalTrimmedString,
    imagem: optionalTrimmedString,
    vagas_totais: requiredInteger,
    vagas_disponiveis: optionalInteger,
    carga_horaria: optionalInteger,
    horario_inicial: optionalHour,
    controle_horario_atendimento: z.boolean().optional(),
    horario_final_atendimento: optionalHour,
    intervalo_atendimento_minutos: optionalIntervalMinutes,
    duracao_horas: requiredInteger,
    dias_semana: optionalStringArray,
    faixa_etaria: optionalStringArray,
    vaga_preferencial_idosos: z.boolean().optional(),
    sexo_permitido: optionalTrimmedString,
    restricoes: optionalTrimmedString,
    profissional: optionalTrimmedString,
    instituicao_parceira: optionalTrimmedString,
    sala_id: optionalInteger,
    status: z.enum(matriculaStatusValues, {
        required_error: "Informe o status.",
        invalid_type_error: "Informe o status."
    }),
    data_triagem: optionalIsoDate,
    data_encaminhamento: optionalIsoDate,
    data_conclusao: optionalIsoDate,
    matriculas: z.array(matriculaInscricaoInputSchema).optional(),
    fila_espera: z.array(matriculaFilaEsperaInputSchema).optional()
}).superRefine((value, context) => {
    if (!value.controle_horario_atendimento)
        return;
    if (value.tipo.trim().toUpperCase() !== "ATENDIMENTO") {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["controle_horario_atendimento"], message: "O controle por horário está disponível apenas para atendimentos." });
        return;
    }
    if (!value.horario_inicial || !value.horario_final_atendimento || value.duracao_horas <= 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["duracao_horas"], message: "Informe os horários inicial e final e a duração do atendimento em minutos." });
        return;
    }
    const [horaInicial, minutoInicial] = value.horario_inicial.split(":").map(Number);
    const [horaFinal, minutoFinal] = value.horario_final_atendimento.split(":").map(Number);
    const inicio = horaInicial * 60 + minutoInicial;
    const fim = horaFinal * 60 + minutoFinal;
    if (fim <= inicio) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["horario_final_atendimento"], message: "O horário final deve ser posterior ao horário inicial." });
    }
    else if ((fim - inicio) % value.duracao_horas !== 0) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["duracao_horas"], message: "A duração em minutos deve dividir exatamente o período informado." });
    }
});
export const matriculaFiltersSchema = z.object({
    nome: optionalTrimmedString,
    tipo: optionalTrimmedString,
    status: optionalTrimmedString,
    profissional: optionalTrimmedString,
    beneficiario: optionalTrimmedString
});
export const matriculaPresencaDataCreateSchema = z.object({
    data_aula: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da aula."),
    observacoes: optionalTrimmedString
});
export const matriculaPresencaDataUpdateSchema = z.object({
    observacoes: optionalTrimmedString,
    status: z.enum(presencaDataStatusValues).optional()
});
export const matriculaPresencaSalvarSchema = z.object({
    data_aula: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da aula."),
    observacoes: optionalTrimmedString,
    senha_confirmacao: optionalTrimmedString,
    presencas: z
        .array(z.object({
        matricula_id: z.string().trim().min(1, "Informe a matricula."),
        status: z.enum(presencaStatusValues),
        observacao: optionalTrimmedString
    }))
        .default([])
});
export const matriculaPresencaSenhaSchema = z.object({
    senha: z.string().trim().min(1, "Informe a senha do usuário logado.")
});
