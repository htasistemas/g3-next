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

const optionalDecimal = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }
  return value;
}, z.number().finite().optional());

export const termoDocumentoInputSchema = z.object({
  id: optionalTrimmedString,
  nome: z.string().trim().min(2, "Informe o nome do documento."),
  dataUrl: optionalTrimmedString.nullable().optional(),
  tipo: z.enum(["termo", "aditivo", "outro"]).nullable().optional()
});

export const termoAditivoInputSchema = z.object({
  id: optionalTrimmedString,
  tipoAditivo: z.string().trim().min(2, "Informe o tipo de aditivo."),
  dataAditivo: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  novaDataFim: optionalIsoDate.nullable().optional(),
  novoValor: optionalDecimal.nullable().optional(),
  observacoes: optionalTrimmedString.nullable().optional(),
  anexo: termoDocumentoInputSchema.nullable().optional()
});

export const termoFomentoInputSchema = z.object({
  id: optionalTrimmedString,
  numeroTermo: z.string().trim().min(2, "Informe o número do termo."),
  tipoTermo: z.string().trim().min(2, "Informe o tipo do termo."),
  orgaoConcedente: optionalTrimmedString.nullable().optional(),
  dataAssinatura: optionalIsoDate.nullable().optional(),
  dataInicioVigencia: optionalIsoDate.nullable().optional(),
  dataFimVigencia: optionalIsoDate.nullable().optional(),
  situacao: z.string().trim().min(2, "Informe a situação."),
  descricaoObjeto: optionalTrimmedString.nullable().optional(),
  valorGlobal: optionalDecimal.nullable().optional(),
  responsavelInterno: optionalTrimmedString.nullable().optional(),
  termoDocumento: termoDocumentoInputSchema.nullable().optional(),
  documentosRelacionados: z.array(termoDocumentoInputSchema).optional(),
  aditivos: z.array(termoAditivoInputSchema).optional()
});
