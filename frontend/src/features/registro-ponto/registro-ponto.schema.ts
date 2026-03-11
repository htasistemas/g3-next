import { z } from "zod";
import type { RegistroPontoFiltro, RegistroPontoOcorrenciaTipo } from "@/types/registro-ponto";
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
