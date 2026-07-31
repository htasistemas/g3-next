import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().min(0).optional());

const requiredInteger = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().min(0));

const matriculaStatusValues = ["ATIVO", "FINALIZADO", "CANCELADO"] as const;

export const matriculaFormSchema = z.object({
  id_matricula: z.string().optional(),
  tipo: z.string().trim().min(3, "Informe o tipo."),
  nome: z.string().trim().min(3, "Informe o nome."),
  imagem: optionalTrimmedString,
  descricao: optionalTrimmedString,
  vagas_totais: requiredInteger,
  vagas_disponiveis: optionalInteger,
  carga_horaria: optionalInteger,
  horario_inicial: optionalTrimmedString,
  duracao_horas: requiredInteger,
  dias_semana: z.array(z.string()).default([]),
  faixa_etaria: z.array(z.string()).default([]),
  vaga_preferencial_idosos: z.boolean().default(false),
  sexo_permitido: optionalTrimmedString,
  restricoes: optionalTrimmedString,
  profissional: optionalTrimmedString,
  instituicao_parceira: optionalTrimmedString,
  unidade_id: optionalTrimmedString,
  sala_id: optionalTrimmedString,
  status: z.enum(matriculaStatusValues, {
    required_error: "Informe o status.",
    invalid_type_error: "Informe o status."
  }),
  data_triagem: optionalTrimmedString,
  data_encaminhamento: optionalTrimmedString,
  data_conclusao: optionalTrimmedString
});

export type MatriculaFormInput = z.input<typeof matriculaFormSchema>;
export type MatriculaFormValues = z.infer<typeof matriculaFormSchema>;

export const matriculaDefaultValues: MatriculaFormValues = {
  tipo: "Curso",
  nome: "",
  imagem: "",
  descricao: "",
  vagas_totais: 0,
  vagas_disponiveis: 0,
  carga_horaria: undefined,
  horario_inicial: "",
  duracao_horas: 0,
  dias_semana: [],
  faixa_etaria: [],
  vaga_preferencial_idosos: false,
  sexo_permitido: "",
  restricoes: "",
  profissional: "",
  instituicao_parceira: "",
  unidade_id: "",
  sala_id: "",
  status: "ATIVO",
  data_triagem: "",
  data_encaminhamento: "",
  data_conclusao: ""
};

export const matriculaTipoOptions = [
  { value: "Curso", label: "Curso" },
  { value: "Atendimento", label: "Atendimento" },
  { value: "Oficina", label: "Oficina" }
] as const;

export const matriculaStatusOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" }
] as const;

export const matriculaSexoPermitidoOptions = [
  { value: "TODOS", label: "Todos" },
  { value: "FEMININO", label: "Feminino" },
  { value: "MASCULINO", label: "Masculino" }
] as const;

export const diasSemanaOptions = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
] as const;

export const faixaEtariaOptions = [
  "0 a 5 anos",
  "6 a 11 anos",
  "12 a 17 anos",
  "18 a 29 anos",
  "30 a 59 anos",
  "60 anos ou mais"
] as const;

export const statusInscricaoOptions = [
  { value: "ATIVO", label: "Ativo" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" }
] as const;

export const statusAgendamentoOptions = [
  { value: "AGUARDANDO", label: "Aguardando" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "REMARCAR", label: "Remarcar" },
  { value: "REMARCADO", label: "Remarcado" },
  { value: "NAO_RESPONDEU", label: "Não respondeu" }
] as const;

