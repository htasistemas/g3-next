import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const optionalTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional());

const prioridadeSchema = z.enum(["Normal", "Media", "Alta", "Urgencia"]);
const modalidadeSchema = z.enum(["Presencial", "Remoto", "Domiciliar", "Externo", "Coletivo"]);
const tipoOperacionalSchema = z.enum(["curso", "atendimento", "oficina"]);

export const agendamentoParticipanteSchema = z.object({
  matriculaId: z.coerce.number().int().positive().optional().nullable(),
  beneficiarioId: z.coerce.number().int().positive().optional().nullable(),
  beneficiarioNome: z.string().trim().min(2, "Informe o participante."),
  telefone: optionalTrimmedString.nullable().optional(),
  comparecimento: z.enum(["Pendente", "Presente", "Faltou", "Justificado"]).optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const agendamentoInputSchema = z.object({
  beneficiarioId: z.coerce.number().int().positive().optional().nullable(),
  familiaId: z.coerce.number().int().positive().optional().nullable(),
  inscricaoOrigemId: optionalTrimmedString.nullable().optional(),
  beneficiarioNome: z.string().trim().min(2, "Informe o beneficiário."),
  familiaNome: optionalTrimmedString.nullable().optional(),
  responsavelNome: optionalTrimmedString.nullable().optional(),
  telefone: optionalTrimmedString.nullable().optional(),
  email: optionalTrimmedString.nullable().optional(),
  formaContatoPreferencial: optionalTrimmedString.nullable().optional(),
  observacoesImportantes: optionalTrimmedString.nullable().optional(),
  restricoesAlerta: optionalTrimmedString.nullable().optional(),
  necessidadeEspecial: optionalTrimmedString.nullable().optional(),
  transporteApoio: optionalTrimmedString.nullable().optional(),
  unidade: z.string().trim().min(2, "Informe a unidade."),
  setor: z.string().trim().min(2, "Informe o setor."),
  tipoAtendimento: z.string().trim().min(2, "Informe o tipo de atendimento."),
  subcategoria: optionalTrimmedString.nullable().optional(),
  profissionalId: optionalTrimmedString.nullable().optional(),
  profissionalNome: optionalTrimmedString.nullable().optional(),
  equipeApoio: z.array(z.string().trim().min(2)).optional().nullable(),
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicial: z.string().trim().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  horaFinal: optionalTime.nullable().optional(),
  duracaoMinutos: z.coerce.number().int().positive().max(1440).optional().nullable(),
  sala: optionalTrimmedString.nullable().optional(),
  recurso: optionalTrimmedString.nullable().optional(),
  modalidade: modalidadeSchema,
  origemAtendimento: optionalTrimmedString.nullable().optional(),
  prioridade: prioridadeSchema,
  status: z
    .enum([
      "Agendado",
      "Confirmado",
      "Em espera",
      "Encaixe",
      "Em atendimento",
      "Atendido",
      "Faltou",
      "Cancelado",
      "Remarcado",
      "Encaminhado",
      "Retorno pendente",
      "Alta",
      "Atendimento coletivo",
      "Urgencia"
    ])
    .optional(),
  motivo: optionalTrimmedString.nullable().optional(),
  objetivo: optionalTrimmedString.nullable().optional(),
  observacaoInterna: optionalTrimmedString.nullable().optional(),
  observacaoCurta: optionalTrimmedString.nullable().optional(),
  coletivo: z.coerce.boolean().optional(),
  tituloColetivo: optionalTrimmedString.nullable().optional(),
  capacidadeMaxima: z.coerce.number().int().positive().max(10000).optional().nullable(),
  participantes: z.array(agendamentoParticipanteSchema).optional().nullable(),
  recorrencia: z
    .object({
      frequencia: z.enum(["Semanal", "Quinzenal", "Mensal", "Personalizada"]).optional(),
      repeticoes: z.coerce.number().int().positive().max(52).optional(),
      intervaloDias: z.coerce.number().int().positive().max(365).optional().nullable()
    })
    .optional()
    .nullable(),
  retornoProgramadoPara: optionalIsoDate.nullable().optional(),
  encaminhamentoOrigem: optionalTrimmedString.nullable().optional(),
  primeiraVez: z.coerce.boolean().optional(),
  retorno: z.coerce.boolean().optional(),
  urgencia: z.coerce.boolean().optional(),
  documentosPendentes: z.coerce.boolean().optional(),
  autorizacaoPendente: z.coerce.boolean().optional(),
  permitirConflito: z.coerce.boolean().optional(),
  itemTipo: tipoOperacionalSchema.nullable().optional(),
  itemOrigemId: z.coerce.number().int().positive().nullable().optional(),
  itemNome: optionalTrimmedString.nullable().optional(),
  itemDiasSemana: optionalTrimmedString.nullable().optional(),
  itemLocal: optionalTrimmedString.nullable().optional(),
  diaSemana: optionalTrimmedString.nullable().optional()
});

export const agendamentoOperacionalInputSchema = z.object({
  id: optionalTrimmedString.optional(),
  tipo: tipoOperacionalSchema,
  itemId: z.coerce.number().int().positive(),
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  beneficiariosIds: z
    .array(z.coerce.number().int().positive())
    .optional(),
  matriculasIds: z
    .array(z.coerce.number().int().positive())
    .optional()
}).superRefine((input, ctx) => {
  const totalBeneficiarios = input.beneficiariosIds?.length ?? 0;
  const totalMatriculas = input.matriculasIds?.length ?? 0;
  if (!totalBeneficiarios && !totalMatriculas) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["matriculasIds"],
      message: "Selecione ao menos um beneficiário."
    });
  }
});

export const agendamentoListaEsperaInputSchema = z.object({
  beneficiarioId: z.coerce.number().int().positive().optional().nullable(),
  beneficiarioNome: z.string().trim().min(2, "Informe o beneficiário."),
  familiaId: z.coerce.number().int().positive().optional().nullable(),
  familiaNome: optionalTrimmedString.nullable().optional(),
  unidade: optionalTrimmedString.nullable().optional(),
  setor: optionalTrimmedString.nullable().optional(),
  tipoAtendimento: z.string().trim().min(2, "Informe o tipo de atendimento."),
  profissionalPreferencial: optionalTrimmedString.nullable().optional(),
  faixaHorarioPreferida: optionalTrimmedString.nullable().optional(),
  prioridade: prioridadeSchema.optional(),
  motivo: optionalTrimmedString.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional(),
  dataEntrada: optionalIsoDate.nullable().optional(),
  encaixeAutomatico: z.coerce.boolean().optional()
});

export const agendamentoCheckInInputSchema = z.object({
  statusChegada: z.enum([
    "Aguardando",
    "Chegou",
    "Em triagem",
    "Em atendimento",
    "Finalizado",
    "Nao compareceu",
    "Cancelado na recepcao",
    "Reagendado"
  ]),
  horarioChegada: optionalTime.nullable().optional(),
  horarioInicio: optionalTime.nullable().optional(),
  horarioFim: optionalTime.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const agendamentoConclusaoInputSchema = z.object({
  resumo: z.string().trim().min(3, "Informe o resumo do atendimento."),
  desfecho: optionalTrimmedString.nullable().optional(),
  comparecimento: z.enum(["Presente", "Faltou", "Justificado"]).optional(),
  retornoGeradoPara: optionalIsoDate.nullable().optional(),
  encaminhamentoInterno: optionalTrimmedString.nullable().optional(),
  encaminhamentoExterno: optionalTrimmedString.nullable().optional(),
  observacaoImportante: optionalTrimmedString.nullable().optional(),
  custoAtendimento: z.coerce.number().min(0).optional().nullable()
});

export const agendamentoRemarcacaoInputSchema = z.object({
  data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicial: z.string().trim().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  horaFinal: optionalTime.nullable().optional(),
  profissionalNome: optionalTrimmedString.nullable().optional(),
  sala: optionalTrimmedString.nullable().optional(),
  recurso: optionalTrimmedString.nullable().optional(),
  permitirConflito: z.coerce.boolean().optional(),
  motivo: optionalTrimmedString.nullable().optional()
});

export const agendamentoFiltrosSchema = z.object({
  busca: optionalTrimmedString.optional(),
  unidade: optionalTrimmedString.optional(),
  setor: optionalTrimmedString.optional(),
  profissional: optionalTrimmedString.optional(),
  tipoAtendimento: optionalTrimmedString.optional(),
  beneficiario: optionalTrimmedString.optional(),
  familia: optionalTrimmedString.optional(),
  status: optionalTrimmedString.optional(),
  periodoInicio: optionalIsoDate.optional(),
  periodoFim: optionalIsoDate.optional(),
  sala: optionalTrimmedString.optional(),
  recurso: optionalTrimmedString.optional(),
  prioridade: optionalTrimmedString.optional(),
  modalidade: optionalTrimmedString.optional(),
  visualizacao: optionalTrimmedString.optional()
});
