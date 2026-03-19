import { z } from "zod";
const optionalString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === undefined || value === null || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalizado = value.trim().toLowerCase();
        if (["true", "1", "sim"].includes(normalizado))
            return true;
        if (["false", "0", "nao", "não"].includes(normalizado))
            return false;
    }
    return value;
}, z.boolean().optional());
export const formatoRelatorioSchema = z.enum(["pdf", "html"]).default("pdf");
export const beneficiarioRelacaoRequestSchema = z.object({
    nome: optionalString,
    cpf: optionalString,
    codigo: optionalString,
    status: optionalString,
    dataNascimento: optionalString,
    usuarioEmissor: optionalString
});
export const beneficiarioFichaRequestSchema = z.object({
    beneficiarioId: z.string().trim().min(1, "beneficiarioId e obrigatorio."),
    usuarioEmissor: optionalString
});
export const termoAutorizacaoRequestSchema = z.object({
    beneficiarioNome: z.string().trim().min(1, "beneficiarioNome e obrigatorio."),
    rg: optionalString,
    cpf: optionalString,
    enderecoCompleto: optionalString,
    cidade: optionalString,
    uf: optionalString,
    finalidadeDados: optionalString,
    finalidadeImagem: optionalString,
    vigencia: optionalString,
    localAssinatura: optionalString,
    dataAssinatura: optionalString,
    responsavelNome: optionalString,
    responsavelCpf: optionalString,
    responsavelRelacao: optionalString,
    representanteNome: optionalString,
    representanteCargo: optionalString,
    issuedBy: optionalString
});
export const unidadeAssistencialRelacaoRequestSchema = z.object({
    nome_fantasia: optionalString,
    cnpj: optionalString,
    cidade: optionalString,
    unidade_principal: z.boolean().optional(),
    usuarioEmissor: optionalString
});
export const profissionalRelacaoRequestSchema = z.object({
    nome: optionalString,
    categoria: optionalString,
    status: optionalString,
    cpf: optionalString,
    vinculo: optionalString,
    usuarioEmissor: optionalString
});
export const profissionalFichaRequestSchema = z.object({
    profissionalId: z.string().trim().min(1, "profissionalId e obrigatorio."),
    usuarioEmissor: optionalString
});
export const voluntarioRelacaoRequestSchema = z.object({
    nome: optionalString,
    cpf: optionalString,
    status: optionalString,
    email: optionalString,
    usuarioEmissor: optionalString
});
export const voluntarioFichaRequestSchema = z.object({
    voluntarioId: z.string().trim().min(1, "voluntarioId e obrigatorio."),
    usuarioEmissor: optionalString
});
export const matriculasRelacaoRequestSchema = z.object({
    nome: optionalString,
    tipo: optionalString,
    status: optionalString,
    profissional: optionalString,
    beneficiario: optionalString,
    usuarioEmissor: optionalString
});
export const matriculaListaPresencaRequestSchema = z.object({
    matriculaId: z.string().trim().min(1, "matriculaId e obrigatorio."),
    dataAula: optionalString,
    exibirCpf: optionalBoolean,
    usuarioEmissor: optionalString
});
export const comprovanteMatriculaRequestSchema = z.object({
    beneficiarioNome: z.string().trim().min(1, "beneficiarioNome e obrigatorio."),
    cpf: optionalString,
    telefone: optionalString,
    dataRegistro: optionalString,
    cursoNome: optionalString,
    cursoTipo: optionalString,
    cursoStatus: optionalString,
    cursoProfissional: optionalString,
    cursoSala: optionalString,
    cursoHorario: optionalString,
    cursoDias: optionalString,
    cursoPeriodo: optionalString,
    cursoInstituicao: optionalString,
    usuarioEmissor: optionalString
});
export const comprovantePreMatriculaEsperaRequestSchema = z.object({
    beneficiarioNome: z.string().trim().min(1, "beneficiarioNome e obrigatorio."),
    cpf: optionalString,
    telefone: optionalString,
    dataEntradaFila: optionalString,
    posicaoFila: optionalString,
    cursoNome: optionalString,
    cursoTipo: optionalString,
    cursoStatus: optionalString,
    cursoProfissional: optionalString,
    cursoSala: optionalString,
    cursoHorario: optionalString,
    cursoDias: optionalString,
    cursoPeriodo: optionalString,
    cursoInstituicao: optionalString,
    usuarioEmissor: optionalString
});
export const registroDoacaoRelacaoRequestSchema = z.object({
    doador_nome: optionalString,
    tipo_doacao: optionalString,
    status: optionalString,
    data_inicial: optionalString,
    data_final: optionalString,
    usuarioEmissor: optionalString
});
export const doacaoRealizadaRelacaoRequestSchema = z.object({
    beneficiario_nome: optionalString,
    tipo_doacao: optionalString,
    situacao: optionalString,
    data_inicial: optionalString,
    data_final: optionalString,
    usuarioEmissor: optionalString
});
export const doacaoRealizadaReciboRequestSchema = z.object({
    doacaoRealizadaId: z.string().trim().min(1, "doacaoRealizadaId e obrigatorio."),
    usuarioEmissor: optionalString
});
