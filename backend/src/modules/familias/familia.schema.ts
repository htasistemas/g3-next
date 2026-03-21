import { z } from "zod";
import { familiaStatusValues } from "./familia.types.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}, z.boolean().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().nonnegative().optional());

const optionalId = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive().optional());

const requiredId = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const familiaMembroInputSchema = z.object({
  id_familia_membro: optionalId,
  id_beneficiario: requiredId,
  parentesco: z.string().trim().min(1, "Parentesco é obrigatório.").max(120),
  responsavel_familiar: optionalBoolean,
  contribui_renda: optionalBoolean,
  renda_individual: optionalTrimmedString,
  participa_servicos: optionalBoolean,
  observacoes: optionalTrimmedString,
  usa_endereco_familia: optionalBoolean
});

export const familiaInputSchema = z
  .object({
    nome_familia: z.string().trim().min(3, "Informe o nome da família."),
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
    membros: z.array(familiaMembroInputSchema).min(1, "Informe pelo menos um membro da família.")
  })
  .superRefine((value, ctx) => {
    const ids = new Set<number>();
    let responsaveis = 0;

    for (const [index, membro] of value.membros.entries()) {
      if (ids.has(membro.id_beneficiario)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Não é permitido repetir o mesmo beneficiário na família.",
          path: ["membros", index, "id_beneficiario"]
        });
      }
      ids.add(membro.id_beneficiario);
      if (membro.responsavel_familiar) responsaveis += 1;
    }

    if (!value.id_referencia_familiar && responsaveis === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A família deve possuir um responsável familiar.",
        path: ["id_referencia_familiar"]
      });
    }

    if (responsaveis > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A família pode ter apenas um responsável familiar.",
        path: ["membros"]
      });
    }
  });

export const familiaEnderecoInputSchema = z.object({
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
  observacoes: optionalTrimmedString,
  sincronizar_membros: optionalBoolean
});

export const familiaResponsavelInputSchema = z.object({
  id_beneficiario: requiredId
});

export const familiaTransferenciaMembroInputSchema = z.object({
  id_membro: requiredId,
  familia_destino_id: requiredId,
  parentesco: optionalTrimmedString,
  responsavel_familiar: optionalBoolean
});

export const familiaDesmembramentoInputSchema = z.object({
  membro_ids: z.array(requiredId).min(1, "Selecione pelo menos um membro para desmembrar."),
  nome_familia: z.string().trim().min(3, "Informe o nome da nova família."),
  novo_responsavel_id: requiredId,
  copiar_endereco_familiar: optionalBoolean,
  endereco: familiaEnderecoInputSchema.optional(),
  observacoes: optionalTrimmedString
});

export const familiaBeneficioValidacaoSchema = z.object({
  beneficio_nome: z.string().trim().min(2, "Informe o benefício."),
  beneficiario_id: optionalId,
  data_referencia: optionalIsoDate,
  quantidade_dias_carencia: optionalInteger
});

export const familiaFiltersSchema = z.object({
  nome_familia: optionalTrimmedString,
  municipio: optionalTrimmedString,
  referencia: optionalTrimmedString,
  status: optionalTrimmedString
});
