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
const optionalPositiveNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }
    if (typeof value === "string") {
        const normalized = value.replace(/\./g, "").replace(",", ".").trim();
        if (!normalized)
            return undefined;
        return Number(normalized);
    }
    return value;
}, z.number().finite().nonnegative().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "sim", "yes"].includes(normalized))
            return true;
        if (["false", "0", "nao", "não", "no"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean().optional());
const criterioSchema = z.object({
    criterio: z.string().trim().min(2, "Informe o critério."),
    peso: optionalPositiveNumber.nullable().optional(),
    nota: optionalPositiveNumber.nullable().optional(),
    observacao: optionalTrimmedString.nullable().optional()
});
const experienciaSchema = z.object({
    empresa: optionalTrimmedString.nullable().optional(),
    cargo: optionalTrimmedString.nullable().optional(),
    dataInicio: optionalIsoDate.nullable().optional(),
    dataFim: optionalIsoDate.nullable().optional(),
    atividades: optionalTrimmedString.nullable().optional(),
    motivoSaida: optionalTrimmedString.nullable().optional()
});
const formacaoSchema = z.object({
    curso: optionalTrimmedString.nullable().optional(),
    instituicao: optionalTrimmedString.nullable().optional(),
    situacao: optionalTrimmedString.nullable().optional(),
    anoConclusao: optionalTrimmedString.nullable().optional()
});
const habilidadeSchema = z.object({
    categoria: optionalTrimmedString.nullable().optional(),
    descricao: optionalTrimmedString.nullable().optional(),
    nivel: optionalTrimmedString.nullable().optional()
});
const situacaoCandidatoValues = [
    "ATIVO",
    "EM_ANALISE",
    "PRE_SELECIONADO",
    "EM_ENTREVISTA",
    "ENCAMINHADO",
    "APROVADO",
    "REPROVADO",
    "CONTRATADO",
    "BANCO_TALENTOS",
    "INATIVO"
];
const situacaoVagaValues = [
    "ABERTA",
    "EM_TRIAGEM",
    "EM_ENTREVISTA",
    "PREENCHIDA",
    "CANCELADA"
];
const etapaProcessoValues = [
    "TRIAGEM_INICIAL",
    "PRE_SELECIONADOS",
    "ENTREVISTA_AGENDADA",
    "APROVADOS",
    "REPROVADOS",
    "CONTRATADOS",
    "BANCO_TALENTOS"
];
const statusProcessoValues = [
    "EM_ANALISE",
    "ENCAMINHADO",
    "ENTREVISTA_MARCADA",
    "APROVADO",
    "REPROVADO",
    "CONTRATADO",
    "BANCO_TALENTOS"
];
const categoriaDocumentoValues = [
    "CURRICULO",
    "CERTIFICADO",
    "DOCUMENTO_COMPLEMENTAR"
];
export const bancoEmpregosDashboardFiltersSchema = z.object({
    bairro: optionalTrimmedString.nullable().optional(),
    cidade: optionalTrimmedString.nullable().optional(),
    escolaridade: optionalTrimmedString.nullable().optional(),
    areaInteresse: optionalTrimmedString.nullable().optional(),
    cargoPretendido: optionalTrimmedString.nullable().optional(),
    sexo: optionalTrimmedString.nullable().optional(),
    idadeExata: optionalPositiveNumber.nullable().optional(),
    faixaEtaria: optionalTrimmedString.nullable().optional(),
    situacao: optionalTrimmedString.nullable().optional(),
    possuiCurriculo: optionalBoolean.nullable().optional(),
    possuiCertificados: optionalBoolean.nullable().optional(),
    possuiExperiencia: optionalBoolean.nullable().optional(),
    statusVaga: optionalTrimmedString.nullable().optional(),
    dataCadastroDe: optionalIsoDate.nullable().optional(),
    dataCadastroAte: optionalIsoDate.nullable().optional()
});
export const bancoEmpregosCandidatoFiltersSchema = bancoEmpregosDashboardFiltersSchema.extend({
    termo: optionalTrimmedString.nullable().optional(),
    nome: optionalTrimmedString.nullable().optional(),
    cpf: optionalTrimmedString.nullable().optional(),
    disponibilidade: optionalTrimmedString.nullable().optional(),
    pagina: optionalPositiveNumber.nullable().optional(),
    limite: optionalPositiveNumber.nullable().optional()
});
export const bancoEmpregosVagaFiltersSchema = z.object({
    termo: optionalTrimmedString.nullable().optional(),
    titulo: optionalTrimmedString.nullable().optional(),
    empresaNome: optionalTrimmedString.nullable().optional(),
    area: optionalTrimmedString.nullable().optional(),
    cidade: optionalTrimmedString.nullable().optional(),
    situacao: optionalTrimmedString.nullable().optional(),
    dataAberturaDe: optionalIsoDate.nullable().optional(),
    dataAberturaAte: optionalIsoDate.nullable().optional(),
    semSelecionado: optionalBoolean.nullable().optional(),
    pagina: optionalPositiveNumber.nullable().optional(),
    limite: optionalPositiveNumber.nullable().optional()
});
export const bancoEmpregosProcessoFiltersSchema = z.object({
    vagaId: optionalTrimmedString.nullable().optional(),
    candidatoId: optionalTrimmedString.nullable().optional(),
    etapa: optionalTrimmedString.nullable().optional(),
    status: optionalTrimmedString.nullable().optional(),
    selecionado: optionalBoolean.nullable().optional(),
    contratado: optionalBoolean.nullable().optional(),
    pagina: optionalPositiveNumber.nullable().optional(),
    limite: optionalPositiveNumber.nullable().optional()
});
export const bancoEmpregosHistoricoFiltersSchema = z.object({
    entidadeTipo: optionalTrimmedString.nullable().optional(),
    candidatoId: optionalTrimmedString.nullable().optional(),
    vagaId: optionalTrimmedString.nullable().optional(),
    processoId: optionalTrimmedString.nullable().optional(),
    pagina: optionalPositiveNumber.nullable().optional(),
    limite: optionalPositiveNumber.nullable().optional()
});
export const bancoEmpregosCandidatoInputSchema = z.object({
    beneficiarioId: optionalTrimmedString.nullable().optional(),
    nomeCompleto: z.string().trim().min(2, "Informe o nome completo."),
    cpf: optionalTrimmedString.nullable().optional(),
    rg: optionalTrimmedString.nullable().optional(),
    dataNascimento: optionalIsoDate.nullable().optional(),
    sexo: optionalTrimmedString.nullable().optional(),
    estadoCivil: optionalTrimmedString.nullable().optional(),
    telefone: optionalTrimmedString.nullable().optional(),
    whatsapp: optionalTrimmedString.nullable().optional(),
    email: optionalTrimmedString.nullable().optional(),
    cep: optionalTrimmedString.nullable().optional(),
    endereco: optionalTrimmedString.nullable().optional(),
    bairro: optionalTrimmedString.nullable().optional(),
    cidade: optionalTrimmedString.nullable().optional(),
    uf: optionalTrimmedString.nullable().optional(),
    escolaridade: optionalTrimmedString.nullable().optional(),
    cursos: optionalTrimmedString.nullable().optional(),
    formacaoComplementar: optionalTrimmedString.nullable().optional(),
    areaInteresse: optionalTrimmedString.nullable().optional(),
    cargoPretendido: optionalTrimmedString.nullable().optional(),
    pretensaoSalarial: optionalPositiveNumber.nullable().optional(),
    disponibilidade: optionalTrimmedString.nullable().optional(),
    possuiExperiencia: optionalBoolean.nullable().optional(),
    ultimaEmpresa: optionalTrimmedString.nullable().optional(),
    funcaoExercida: optionalTrimmedString.nullable().optional(),
    tempoExperiencia: optionalTrimmedString.nullable().optional(),
    resumoProfissional: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    situacao: z.enum(situacaoCandidatoValues).optional(),
    experiencias: z.array(experienciaSchema).optional(),
    formacoes: z.array(formacaoSchema).optional(),
    habilidades: z.array(habilidadeSchema).optional(),
    curriculoExtraido: z.record(z.unknown()).nullable().optional()
});
export const bancoEmpregosVagaInputSchema = z.object({
    titulo: z.string().trim().min(2, "Informe o título da vaga."),
    empresaNome: z.string().trim().min(2, "Informe a empresa ou instituição."),
    area: optionalTrimmedString.nullable().optional(),
    quantidadeVagas: optionalPositiveNumber.nullable().optional(),
    requisitos: optionalTrimmedString.nullable().optional(),
    escolaridadeMinima: optionalTrimmedString.nullable().optional(),
    experienciaMinima: optionalTrimmedString.nullable().optional(),
    bairro: optionalTrimmedString.nullable().optional(),
    cidade: optionalTrimmedString.nullable().optional(),
    tipoContratacao: optionalTrimmedString.nullable().optional(),
    jornada: optionalTrimmedString.nullable().optional(),
    faixaSalarial: optionalTrimmedString.nullable().optional(),
    beneficios: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    dataAbertura: optionalIsoDate.nullable().optional(),
    dataLimite: optionalIsoDate.nullable().optional(),
    situacao: z.enum(situacaoVagaValues).optional(),
    projetoServico: optionalTrimmedString.nullable().optional(),
    unidadeReferencia: optionalTrimmedString.nullable().optional(),
    criterios: z.array(criterioSchema).optional()
});
export const bancoEmpregosProcessoInputSchema = z.object({
    vagaId: z.string().trim().min(1, "Informe a vaga."),
    candidatoId: z.string().trim().min(1, "Informe o candidato."),
    etapa: z.enum(etapaProcessoValues).nullable().optional(),
    status: z.enum(statusProcessoValues).nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    responsavelNome: optionalTrimmedString.nullable().optional(),
    dataEntrevista: optionalIsoDate.nullable().optional(),
    dataEncaminhamento: optionalIsoDate.nullable().optional(),
    selecionado: optionalBoolean.nullable().optional(),
    contratado: optionalBoolean.nullable().optional()
});
export const bancoEmpregosAvaliacaoInputSchema = z.object({
    criterios: z.array(criterioSchema).min(1, "Informe ao menos um critério."),
    observacaoGeral: optionalTrimmedString.nullable().optional()
});
export const bancoEmpregosDocumentoUploadSchema = z.object({
    categoria: z.enum(categoriaDocumentoValues),
    descricao: optionalTrimmedString.nullable().optional(),
    textoExtraido: optionalTrimmedString.nullable().optional()
});
