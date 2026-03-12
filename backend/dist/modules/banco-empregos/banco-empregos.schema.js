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
export const jobPayloadSchema = z.object({
    dadosVaga: z.object({
        titulo: z.string().trim().min(2, "Informe o titulo da vaga."),
        area: optionalTrimmedString.nullable().optional(),
        tipo: optionalTrimmedString.nullable().optional(),
        nivel: optionalTrimmedString.nullable().optional(),
        modelo: optionalTrimmedString.nullable().optional(),
        status: z.enum(["Aberta", "Pausada", "Encerrada"]),
        dataAbertura: optionalIsoDate.nullable().optional(),
        dataEncerramento: optionalIsoDate.nullable().optional(),
        tipoContrato: optionalTrimmedString.nullable().optional(),
        cargaHoraria: optionalTrimmedString.nullable().optional(),
        salario: optionalTrimmedString.nullable().optional(),
        beneficios: optionalTrimmedString.nullable().optional()
    }),
    empresaLocal: z
        .object({
        nomeEmpresa: z.string().trim().min(2, "Informe o nome da empresa."),
        cnpj: optionalTrimmedString.nullable().optional(),
        responsavel: optionalTrimmedString.nullable().optional(),
        telefone: optionalTrimmedString.nullable().optional(),
        email: optionalTrimmedString.nullable().optional(),
        endereco: optionalTrimmedString.nullable().optional(),
        bairro: optionalTrimmedString.nullable().optional(),
        cidade: optionalTrimmedString.nullable().optional(),
        uf: optionalTrimmedString.nullable().optional()
    })
        .nullable()
        .optional(),
    requisitos: z
        .object({
        escolaridade: optionalTrimmedString.nullable().optional(),
        experiencia: optionalTrimmedString.nullable().optional(),
        habilidades: optionalTrimmedString.nullable().optional(),
        requisitos: optionalTrimmedString.nullable().optional(),
        descricao: optionalTrimmedString.nullable().optional(),
        observacoes: optionalTrimmedString.nullable().optional()
    })
        .nullable()
        .optional(),
    encaminhamentos: z
        .array(z.object({
        id: optionalTrimmedString.optional(),
        beneficiarioId: optionalTrimmedString.nullable().optional(),
        beneficiarioNome: z.string().trim().min(2, "Informe o nome do beneficiario."),
        beneficiarioTelefone: optionalTrimmedString.nullable().optional(),
        data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.string().trim().min(2, "Informe o status do encaminhamento."),
        observacoes: optionalTrimmedString.nullable().optional()
    }))
        .optional()
});
export const jobCandidatoInputSchema = z.object({
    beneficiarioId: optionalTrimmedString.nullable().optional(),
    beneficiarioNome: z.string().trim().min(2, "Informe o nome do candidato."),
    necessidadesProfissionais: optionalTrimmedString.nullable().optional(),
    status: optionalTrimmedString.nullable().optional(),
    curriculoNome: optionalTrimmedString.nullable().optional(),
    curriculoTipo: optionalTrimmedString.nullable().optional(),
    curriculoConteudo: optionalTrimmedString.nullable().optional()
});
