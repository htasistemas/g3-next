import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalDecimal = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }
  return value;
}, z.number().finite().optional());

export const transparenciaInputSchema = z.object({
  id: optionalTrimmedString,
  unidadeId: optionalTrimmedString.nullable().optional(),
  totalRecebido: optionalDecimal.nullable().optional(),
  totalRecebidoHelper: optionalTrimmedString.nullable().optional(),
  totalAplicado: optionalDecimal.nullable().optional(),
  totalAplicadoHelper: optionalTrimmedString.nullable().optional(),
  saldoDisponivel: optionalDecimal.nullable().optional(),
  saldoDisponivelHelper: optionalTrimmedString.nullable().optional(),
  prestadoMes: optionalDecimal.nullable().optional(),
  prestadoMesHelper: optionalTrimmedString.nullable().optional(),
  recebimentos: z.array(
    z.object({
      id: optionalTrimmedString,
      fonte: z.string().trim().min(2, "Informe a fonte."),
      valor: optionalDecimal.nullable().optional(),
      periodicidade: optionalTrimmedString.nullable().optional(),
      status: optionalTrimmedString.nullable().optional()
    })
  ),
  destinacoes: z.array(
    z.object({
      id: optionalTrimmedString,
      titulo: z.string().trim().min(2, "Informe o título."),
      descricao: optionalTrimmedString.nullable().optional(),
      percentual: optionalDecimal.nullable().optional()
    })
  ),
  comprovantes: z.array(
    z.object({
      id: optionalTrimmedString,
      titulo: z.string().trim().min(2, "Informe o título."),
      descricao: optionalTrimmedString.nullable().optional(),
      arquivoNome: optionalTrimmedString.nullable().optional(),
      arquivoUrl: optionalTrimmedString.nullable().optional()
    })
  ),
  timelines: z.array(
    z.object({
      id: optionalTrimmedString,
      titulo: z.string().trim().min(2, "Informe o título."),
      detalhe: optionalTrimmedString.nullable().optional(),
      status: optionalTrimmedString.nullable().optional()
    })
  ),
  checklist: z.array(
    z.object({
      id: optionalTrimmedString,
      titulo: z.string().trim().min(2, "Informe o título."),
      descricao: optionalTrimmedString.nullable().optional(),
      status: optionalTrimmedString.nullable().optional()
    })
  )
});
