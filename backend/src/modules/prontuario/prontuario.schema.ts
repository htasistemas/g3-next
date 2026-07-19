import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().optional());

const optionalDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const optionalDateTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().min(10).optional());

export const prontuarioBuscaSchema = z.object({
  busca: optionalText
});

export const prontuarioAtendimentoSchema = z.object({
  especialidade: z.string().trim().min(2, "Informe a especialidade."),
  tipo_atendimento: z.string().trim().min(2, "Informe o tipo de atendimento."),
  data_atendimento: optionalDate,
  hora_inicio: optionalDateTime,
  hora_fim: optionalDateTime,
  status: z.enum(["RASCUNHO", "EM_ATENDIMENTO", "FINALIZADO", "CANCELADO"]).optional(),
  motivo: optionalText,
  demanda_principal: optionalText,
  avaliacao: optionalText,
  evolucao: optionalText,
  intervencoes: z.array(z.string().trim().min(1)).optional(),
  conduta: optionalText,
  retorno_data: optionalDate,
  observacoes: optionalText,
  campos_especificos: z.record(z.unknown()).optional(),
  restrito: z.boolean().optional(),
  profissional_id: optionalText,
  unidade_id: optionalText
});

export const prontuarioAdendoSchema = z.object({
  conteudo: z.string().trim().min(3, "Informe o conteúdo do adendo."),
  motivo: optionalText
});
