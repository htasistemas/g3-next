import { z } from "zod";
import { isValidCep, isValidCpf, isValidPhone } from "../../utils/validators.js";
import { beneficiarioStatusValues } from "./beneficiario.types.js";
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
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalEmail = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : undefined;
}, z.string().email("E-mail invalido.").optional());
export const beneficiarioInputSchema = z.object({
    codigo: optionalTrimmedString,
    status: z.enum(beneficiarioStatusValues).default("EM_ANALISE"),
    nome_completo: z.string().trim().min(3, "Informe o nome completo."),
    nome_social: optionalTrimmedString,
    apelido: optionalTrimmedString,
    data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento invalida."),
    foto_3x4: optionalTrimmedString,
    sexo_biologico: optionalTrimmedString,
    identidade_genero: optionalTrimmedString,
    cor_raca: optionalTrimmedString,
    estado_civil: optionalTrimmedString,
    nacionalidade: optionalTrimmedString,
    naturalidade_cidade: optionalTrimmedString,
    naturalidade_uf: optionalTrimmedString,
    nome_mae: z.string().trim().min(3, "Informe o nome da mae."),
    nome_pai: optionalTrimmedString,
    opta_receber_cesta_basica: optionalBoolean,
    apto_receber_cesta_basica: optionalBoolean,
    cep: z
        .string()
        .trim()
        .refine((value) => isValidCep(value), "Informe um CEP valido com 8 digitos."),
    logradouro: optionalTrimmedString,
    numero: optionalTrimmedString,
    complemento: optionalTrimmedString,
    bairro: optionalTrimmedString,
    ponto_referencia: optionalTrimmedString,
    municipio: optionalTrimmedString,
    uf: optionalTrimmedString,
    latitude: optionalTrimmedString,
    longitude: optionalTrimmedString,
    zona: optionalTrimmedString,
    subzona: optionalTrimmedString,
    telefone_principal: z
        .string()
        .trim()
        .refine((value) => isValidPhone(value), "Informe um telefone principal valido."),
    telefone_principal_whatsapp: optionalBoolean,
    telefone_secundario: optionalTrimmedString,
    telefone_recado_nome: optionalTrimmedString,
    telefone_recado_numero: optionalTrimmedString,
    email: optionalEmail,
    permite_contato_tel: optionalBoolean,
    permite_contato_whatsapp: optionalBoolean,
    permite_contato_sms: optionalBoolean,
    permite_contato_email: optionalBoolean,
    horario_preferencial_contato: optionalTrimmedString,
    cpf: z
        .string()
        .trim()
        .refine((value) => isValidCpf(value), "Informe um CPF valido."),
    rg_numero: optionalTrimmedString,
    rg_orgao_emissor: optionalTrimmedString,
    rg_uf: optionalTrimmedString,
    rg_data_emissao: optionalIsoDate,
    nis: optionalTrimmedString,
    certidao_tipo: optionalTrimmedString,
    certidao_livro: optionalTrimmedString,
    certidao_folha: optionalTrimmedString,
    certidao_termo: optionalTrimmedString,
    certidao_cartorio: optionalTrimmedString,
    certidao_municipio: optionalTrimmedString,
    certidao_uf: optionalTrimmedString,
    titulo_eleitor: optionalTrimmedString,
    cnh: optionalTrimmedString,
    cartao_sus: optionalTrimmedString,
    mora_com_familia: optionalBoolean,
    responsavel_legal: optionalBoolean,
    vinculo_familiar: optionalTrimmedString,
    situacao_vulnerabilidade: optionalTrimmedString,
    composicao_familiar: optionalTrimmedString,
    criancas_adolescentes: optionalInteger,
    idosos: optionalInteger,
    acompanhamento_cras: optionalBoolean,
    acompanhamento_saude: optionalBoolean,
    participa_comunidade: optionalTrimmedString,
    rede_apoio: optionalTrimmedString,
    sabe_ler_escrever: optionalBoolean,
    nivel_escolaridade: optionalTrimmedString,
    estuda_atualmente: optionalBoolean,
    ocupacao: optionalTrimmedString,
    situacao_trabalho: optionalTrimmedString,
    local_trabalho: optionalTrimmedString,
    renda_mensal: optionalTrimmedString,
    fonte_renda: optionalTrimmedString,
    possui_deficiencia: optionalBoolean,
    tipo_deficiencia: optionalTrimmedString,
    cid_principal: optionalTrimmedString,
    usa_medicacao_continua: optionalBoolean,
    descricao_medicacao: optionalTrimmedString,
    servico_saude_referencia: optionalTrimmedString,
    recebe_beneficio: optionalBoolean,
    beneficios_descricao: optionalTrimmedString,
    valor_total_beneficios: optionalTrimmedString,
    beneficios_recebidos: z.array(z.string().trim()).optional(),
    aceite_lgpd: z.literal(true, {
        errorMap: () => ({ message: "Confirme o aceite LGPD para salvar." })
    }),
    data_aceite_lgpd: optionalIsoDate,
    observacoes: optionalTrimmedString,
    documentos_obrigatorios: z
        .array(z.object({
        id: z.union([z.string(), z.number()]).optional(),
        nome: z.string().trim().min(1, "Nome do documento obrigatorio."),
        numeroDocumento: optionalTrimmedString,
        nomeArquivo: optionalTrimmedString,
        caminhoArquivo: optionalTrimmedString,
        contentType: optionalTrimmedString,
        obrigatorio: optionalBoolean,
        ignorado: optionalBoolean,
        conteudo: optionalTrimmedString
    }))
        .optional()
});
export const beneficiarioFiltersSchema = z.object({
    nome: optionalTrimmedString,
    status: optionalTrimmedString,
    codigo: optionalTrimmedString,
    cpf: optionalTrimmedString,
    nis: optionalTrimmedString,
    data_nascimento: optionalIsoDate
});
export const beneficiarioAddressSuggestionSchema = z.object({
    municipio: optionalTrimmedString,
    bairro: optionalTrimmedString
});
