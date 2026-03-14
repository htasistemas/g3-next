import { z } from "zod";
import type {
  RegistroPontoFiltro,
  RegistroPontoHorarioTrabalhoPayload,
  RegistroPontoOcorrenciaTipo
} from "@/types/registro-ponto";
import { endOfMonthLocalISO, startOfMonthLocalISO } from "@/lib/date-utils";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora inválida.").optional());

export const registroPontoAjusteSchema = z.object({
  entrada_1: optionalTime,
  saida_1: optionalTime,
  entrada_2: optionalTime,
  saida_2: optionalTime,
  observacoes: optionalTrimmedString,
  justificativa: z.string().trim().min(5, "Informe a justificativa."),
  observacao: z.string().trim().min(5, "Informe a observação.")
});

export type RegistroPontoAjusteFormInput = z.input<typeof registroPontoAjusteSchema>;
export type RegistroPontoAjusteFormValues = z.output<typeof registroPontoAjusteSchema>;

export const registroPontoHorarioTrabalhoSchema = z
  .object({
    horario_entrada_1: optionalTime,
    horario_saida_1: optionalTime,
    horario_entrada_2: optionalTime,
    horario_saida_2: optionalTime
  })
  .superRefine((value, context) => {
    if ((value.horario_entrada_1 && !value.horario_saida_1) || (!value.horario_entrada_1 && value.horario_saida_1)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horario_saida_1"],
        message: "Informe entrada e saída do primeiro turno."
      });
    }

    if ((value.horario_entrada_2 && !value.horario_saida_2) || (!value.horario_entrada_2 && value.horario_saida_2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horario_saida_2"],
        message: "Informe entrada e saída do segundo turno."
      });
    }

    const horarios = [
      value.horario_entrada_1,
      value.horario_saida_1,
      value.horario_entrada_2,
      value.horario_saida_2
    ].filter((item): item is string => !!item);

    for (let index = 1; index < horarios.length; index += 1) {
      if (horarios[index] < horarios[index - 1]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["horario_entrada_1"],
          message: "A sequência dos horários de trabalho é inválida."
        });
        break;
      }
    }
  });

export type RegistroPontoHorarioTrabalhoFormInput = z.input<typeof registroPontoHorarioTrabalhoSchema>;
export type RegistroPontoHorarioTrabalhoFormValues = z.output<typeof registroPontoHorarioTrabalhoSchema>;

export const registroPontoHorarioTrabalhoPadrao: RegistroPontoHorarioTrabalhoPayload = {
  horario_entrada_1: "",
  horario_saida_1: "",
  horario_entrada_2: "",
  horario_saida_2: ""
};

export const registroPontoOcorrenciaSchema = z.object({
  tipo: z.enum([
    "AJUSTE_MANUAL",
    "ATRASO",
    "FALTA",
    "HORA_EXTRA",
    "BANCO_HORAS",
    "ESQUECIMENTO_BATIDA",
    "INCONSISTENCIA_SEQUENCIA",
    "CORRECAO_ADMINISTRATIVA",
    "OBSERVACAO_OPERACIONAL"
  ]),
  descricao: optionalTrimmedString
});

export type RegistroPontoOcorrenciaFormValues = {
  tipo: RegistroPontoOcorrenciaTipo;
  descricao?: string;
};

export const filtroRegistroPontoPadrao: RegistroPontoFiltro = {
  data_inicial: startOfMonthLocalISO(),
  data_final: endOfMonthLocalISO(),
  usuario_id: "",
  status: undefined,
  ocorrencia: "",
  unidade: "",
  somente_alterados: false,
  somente_inconsistencias: false
};
