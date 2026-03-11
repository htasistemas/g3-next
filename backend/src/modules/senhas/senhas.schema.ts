import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalTrimmedString255 = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(255).optional());

const optionalTrimmedLongString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(2_000_000).optional());

const avisoSonoroItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(1).max(255),
  url: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : value;
  }, z.string().max(2_000_000))
});

export const senhaEmitirInputSchema = z.object({
  beneficiarioId: z.coerce.number().int().positive(),
  prioridade: z.coerce.number().int().min(0).max(99).nullable().optional(),
  unidadeId: z.coerce.number().int().positive().nullable().optional(),
  usuarioId: z.coerce.number().int().positive().nullable().optional(),
  salaAtendimento: optionalTrimmedString.nullable().optional()
});

export const senhaChamarInputSchema = z.object({
  filaId: z.coerce.number().int().positive(),
  localAtendimento: z.string().trim().min(2, "Informe o local de atendimento."),
  unidadeId: z.coerce.number().int().positive().nullable().optional(),
  usuarioId: z.coerce.number().int().positive().nullable().optional()
});

export const senhaFinalizarInputSchema = z.object({
  chamadaId: z.string().trim().min(1, "Informe a chamada.")
});

export const senhasConfigInputSchema = z.object({
  fraseFala: z.string().trim().min(2, "Informe a frase da chamada."),
  rssUrl: z.string().trim().min(3, "Informe a URL do RSS."),
  velocidadeTicker: z.coerce.number().int().min(5).max(10000),
  modoNoticias: optionalTrimmedString.nullable().optional(),
  noticiasManuais: optionalTrimmedString.nullable().optional(),
  quantidadeUltimasChamadas: z.coerce.number().int().min(1).max(30),
  unidadePainelId: z.coerce.number().int().positive().nullable().optional(),
  tituloTela: optionalTrimmedString.nullable().optional(),
  descricaoTela: optionalTrimmedString.nullable().optional(),
  avisosSonoros: z.array(avisoSonoroItemSchema).max(20).nullable().optional(),
  avisoSonoroAtivoId: optionalTrimmedString255.nullable().optional()
});
