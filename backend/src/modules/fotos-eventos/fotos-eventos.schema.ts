import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().optional());

const fotoUploadSchema = z.object({
  nomeArquivo: z.string().trim().min(1, "Informe o nome do arquivo."),
  contentType: z.string().trim().min(3, "Informe o tipo do arquivo."),
  conteudo: z.string().trim().min(10, "Informe o conteudo em base64.")
});

const positiveInteger = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().positive());

const nonNegativeInteger = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().min(0));

export const fotoEventoInputSchema = z.object({
  titulo: z.string().trim().min(2, "Informe o titulo."),
  descricao: optionalTrimmedString.nullable().optional(),
  dataEvento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  local: optionalTrimmedString.nullable().optional(),
  status: optionalTrimmedString.nullable().optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  unidadeId: optionalNumber.nullable().optional(),
  fotoPrincipalUpload: fotoUploadSchema.nullable().optional(),
  fotoPrincipalId: optionalNumber.nullable().optional()
});

export const fotoEventoFotoInputSchema = z.object({
  arquivo: fotoUploadSchema,
  legenda: optionalTrimmedString.nullable().optional(),
  creditos: optionalTrimmedString.nullable().optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  ordem: optionalNumber.nullable().optional()
});

export const fotoEventoFotosLoteInputSchema = z.object({
  fotos: z.array(fotoEventoFotoInputSchema).min(1, "Adicione ao menos uma foto."),
  fotoPrincipalIndex: nonNegativeInteger.nullable().optional()
});

export const fotoEventoFotoAtualizacaoSchema = z.object({
  legenda: optionalTrimmedString.nullable().optional(),
  creditos: optionalTrimmedString.nullable().optional(),
  tags: z.array(z.string().trim().min(1)).nullable().optional(),
  ordem: optionalNumber.nullable().optional()
});

export const fotoEventoReordenacaoSchema = z.object({
  fotoIds: z.array(positiveInteger).min(1, "Informe a ordem das fotos.")
});
