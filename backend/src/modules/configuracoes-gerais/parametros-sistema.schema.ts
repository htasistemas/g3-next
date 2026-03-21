import { z } from "zod";

const corHexRegex = /^#[0-9a-fA-F]{6}$/;

const corHex = z
  .string()
  .trim()
  .regex(corHexRegex, "Informe uma cor no formato #RRGGBB.");

export const temaModoSchema = z.enum(["CLARO", "ESCURO", "AUTOMATICO"]);

export const paletaTemaSchema = z.object({
  cor_primaria: corHex,
  cor_secundaria: corHex,
  cor_destaque: corHex,
  cor_botao_primario: corHex,
  cor_link: corHex,
  cor_elemento_ativo: corHex,
  background: corHex,
  foreground: corHex,
  border: corHex,
  muted: corHex,
  card: corHex,
  danger: corHex,
  warning: corHex,
  success: corHex,
  info: corHex
});

export const personalizacaoSistemaSchema = z.object({
  modo: temaModoSchema,
  preset: z.string().trim().max(80).optional(),
  paleta: paletaTemaSchema
});

export const atualizarPersonalizacaoPayloadSchema = z.object({
  personalizacao: personalizacaoSistemaSchema
});

export const carenciaDoacaoRealizadaSchema = z.object({
  tempo_carencia_dias: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().min(0, "Informe um numero de dias valido.").max(3650, "Informe um numero de dias valido."))
});

export const atualizarCarenciaDoacaoRealizadaPayloadSchema = z.object({
  carencia: carenciaDoacaoRealizadaSchema
});

export const documentoObrigatoriedadeBeneficiarioSchema = z.object({
  id: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(1).max(120),
  obrigatorio: z.boolean()
});

export const obrigatoriedadeDocumentosBeneficiarioSchema = z.object({
  documentos: z.array(documentoObrigatoriedadeBeneficiarioSchema).max(20)
});

export const atualizarObrigatoriedadeDocumentosBeneficiarioPayloadSchema = z.object({
  obrigatoriedade: obrigatoriedadeDocumentosBeneficiarioSchema
});

export const alertasCentralAtendimentosSchema = z.object({
  dias_sem_atendimento_recente: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return 90;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().min(1).max(3650)),
  valor_custo_elevado_mes: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return 1000;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().min(0).max(999999999)),
  alertar_cesta_mesmo_mes: z.boolean(),
  alertar_familia_cesta_mes: z.boolean(),
  alertar_cadastro_incompleto: z.boolean(),
  alertar_encaminhamento_em_aberto: z.boolean(),
  alertar_inscricao_ativa: z.boolean()
});

export const atualizarAlertasCentralAtendimentosPayloadSchema = z.object({
  alertas: alertasCentralAtendimentosSchema
});
