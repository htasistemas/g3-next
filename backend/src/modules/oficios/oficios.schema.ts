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

export const oficioInputSchema = z.object({
  identificacao: z.object({
    tipo: z.enum(["emissao", "recebimento"]),
    numero: z.string().trim().min(1, "Informe o numero."),
    data: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    setorOrigem: z.string().trim().min(2, "Informe o setor de origem."),
    responsavel: z.string().trim().min(2, "Informe o responsavel."),
    destinatario: optionalTrimmedString.nullable().optional(),
    destinatarioResponsavel: optionalTrimmedString.nullable().optional(),
    destinatarioCargo: optionalTrimmedString.nullable().optional(),
    meioEnvio: z.string().trim().min(2, "Informe o meio de envio."),
    prazoResposta: optionalTrimmedString.nullable().optional(),
    classificacao: optionalTrimmedString.nullable().optional()
  }),
  conteudo: z.object({
    razaoSocial: z.string().trim().min(2, "Informe a razao social."),
    logoUrl: optionalTrimmedString.nullable().optional(),
    titulo: optionalTrimmedString.nullable().optional(),
    saudacao: optionalTrimmedString.nullable().optional(),
    para: optionalTrimmedString.nullable().optional(),
    cargoPara: optionalTrimmedString.nullable().optional(),
    assunto: z.string().trim().min(2, "Informe o assunto."),
    corpo: z.string().trim().min(2, "Informe o corpo do oficio."),
    finalizacao: optionalTrimmedString.nullable().optional(),
    assinaturaNome: optionalTrimmedString.nullable().optional(),
    assinaturaCargo: optionalTrimmedString.nullable().optional(),
    rodape: optionalTrimmedString.nullable().optional()
  }),
  protocolo: z.object({
    status: z.string().trim().min(2, "Informe o status."),
    protocoloEnvio: optionalTrimmedString.nullable().optional(),
    dataEnvio: optionalIsoDate.nullable().optional(),
    protocoloRecebimento: optionalTrimmedString.nullable().optional(),
    dataRecebimento: optionalIsoDate.nullable().optional(),
    proximoDestino: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional()
  }),
  tramites: z
    .array(
      z.object({
        data: optionalIsoDate.nullable().optional(),
        origem: optionalTrimmedString.nullable().optional(),
        destino: optionalTrimmedString.nullable().optional(),
        responsavel: optionalTrimmedString.nullable().optional(),
        acao: z.string().trim().min(2, "Informe a acao do tramite."),
        observacoes: optionalTrimmedString.nullable().optional()
      })
    )
    .optional(),
  unidadeId: z.coerce.number().int().positive().nullable().optional(),
  criadoPor: z.coerce.number().int().positive().nullable().optional()
});

export const oficioPdfAssinadoInputSchema = z.object({
  nomeArquivo: z.string().trim().min(2, "Informe o nome do arquivo."),
  tipoMime: z.string().trim().min(3, "Informe o tipo mime."),
  conteudoBase64: z.string().trim().min(8, "Informe o conteudo base64.")
});

export const oficioImagemInputSchema = z.object({
  nomeArquivo: z.string().trim().min(2, "Informe o nome do arquivo."),
  tipoMime: z.string().trim().min(3, "Informe o tipo mime."),
  conteudoBase64: z.string().trim().min(8, "Informe o conteudo base64."),
  ordem: z.coerce.number().int().nonnegative()
});
