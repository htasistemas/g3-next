import { z } from "zod";
import { normalizarCnpj, normalizarEmail, validarEmail } from "../../utils/br-utils.js";
import { licencaUsoCiclos, licencaUsoPlanos, licencaUsoStatus } from "./licenca-uso.types.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim"].includes(normalized)) return true;
    if (["false", "0", "nao", "não"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return Number(value.replace(/\./g, "").replace(",", "."));
  }
  return value;
}, z.number().finite().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  return value;
}, z.number().int().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Informe a data no formato ISO.").optional());

const emailArraySchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return [];
  return value;
}, z.array(z.string().trim().min(1)).max(10)).transform((items) =>
  items.map((item) => normalizarEmail(item)).filter(Boolean) as string[]
);

const diasAlertaSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => {
      if (typeof item === "number") return item;
      if (typeof item === "string") return Number.parseInt(item, 10);
      return undefined;
    })
    .filter((item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 0);
}, z.array(z.number().int().min(0)).max(10).optional());

export const licencaUsoConfiguracaoSchema = z.object({
  instituicaoNome: optionalTrimmedString,
  instituicaoCnpj: optionalTrimmedString.transform((value) => {
    const cnpj = normalizarCnpj(value);
    return cnpj || undefined;
  }),
  planoId: z.enum(licencaUsoPlanos),
  cicloCobranca: z.enum(licencaUsoCiclos),
  valorBaseMensal: z.number().nonnegative(),
  percentualDesconto: z.number().min(0).max(100),
  valorCobranca: z.number().nonnegative(),
  valorImplantacao: z.number().nonnegative(),
  implantacaoIsenta: z.boolean(),
  dataInicioVigencia: optionalIsoDate,
  dataVencimento: optionalIsoDate,
  statusLicenca: z.enum(licencaUsoStatus),
  alertasEmailAtivos: z.boolean(),
  diasAlertaEmail: z.array(z.number().int().min(0)).max(10),
  emailsAlerta: z.array(z.string().email()).max(10),
  observacoes: optionalTrimmedString,
  pixChave: optionalTrimmedString,
  pixRecebedor: optionalTrimmedString,
  pixCidade: optionalTrimmedString,
  pixAmbiente: z.enum(["sandbox", "producao"]),
  pixWebhookUrl: optionalTrimmedString,
  pixExpiracaoMinutos: z.number().int().min(1),
  pixProvider: z.string().trim().min(1),
  cartaoProvider: z.string().trim().min(1),
  cartaoAmbiente: z.enum(["sandbox", "producao"]),
  cartaoChavePublica: optionalTrimmedString,
  cartaoChavePrivadaRef: optionalTrimmedString,
  cartaoTentativasFalha: z.number().int().min(0),
  boletoProvider: z.string().trim().min(1),
  boletoAmbiente: z.enum(["sandbox", "producao"]),
  boletoPrazoVencimentoDias: z.number().int().min(1),
  boletoInstrucao: optionalTrimmedString,
  mensagemCobranca: optionalTrimmedString,
  checkoutHandle: optionalTrimmedString,
  checkoutRedirectUrl: optionalTrimmedString,
  ultimoCheckoutUrl: optionalTrimmedString,
  ultimoOrderNsu: optionalTrimmedString,
  ultimoInvoiceSlug: optionalTrimmedString,
  ultimaTransactionNsu: optionalTrimmedString,
  ultimoReceiptUrl: optionalTrimmedString,
  ultimoCheckoutPago: z.boolean().optional().default(false),
  ultimoValorPago: z.number().nonnegative().optional().default(0)
});

export const atualizarLicencaUsoPayloadSchema = z.object({
  configuracao: z.object({
    instituicaoNome: optionalTrimmedString.optional(),
    instituicaoCnpj: optionalTrimmedString.optional(),
    planoId: z.enum(licencaUsoPlanos).optional(),
    cicloCobranca: z.enum(licencaUsoCiclos).optional(),
    valorBaseMensal: optionalNumber.optional(),
    percentualDesconto: optionalNumber.optional(),
    valorCobranca: optionalNumber.optional(),
    valorImplantacao: optionalNumber.optional(),
    implantacaoIsenta: optionalBoolean.optional(),
    dataInicioVigencia: optionalIsoDate.optional(),
    dataVencimento: optionalIsoDate.optional(),
    statusLicenca: z.enum(licencaUsoStatus).optional(),
    alertasEmailAtivos: optionalBoolean.optional(),
    diasAlertaEmail: diasAlertaSchema.optional(),
    emailsAlerta: emailArraySchema.optional(),
    observacoes: optionalTrimmedString.optional(),
    pixChave: optionalTrimmedString.optional(),
    pixRecebedor: optionalTrimmedString.optional(),
    pixCidade: optionalTrimmedString.optional(),
    pixAmbiente: z.enum(["sandbox", "producao"]).optional(),
    pixWebhookUrl: optionalTrimmedString.optional(),
    pixExpiracaoMinutos: optionalInteger.optional(),
    pixProvider: optionalTrimmedString.optional(),
    cartaoProvider: optionalTrimmedString.optional(),
    cartaoAmbiente: z.enum(["sandbox", "producao"]).optional(),
    cartaoChavePublica: optionalTrimmedString.optional(),
    cartaoChavePrivadaRef: optionalTrimmedString.optional(),
    cartaoTentativasFalha: optionalInteger.optional(),
    boletoProvider: optionalTrimmedString.optional(),
    boletoAmbiente: z.enum(["sandbox", "producao"]).optional(),
    boletoPrazoVencimentoDias: optionalInteger.optional(),
    boletoInstrucao: optionalTrimmedString.optional(),
    mensagemCobranca: optionalTrimmedString.optional(),
    checkoutHandle: optionalTrimmedString.optional(),
    checkoutRedirectUrl: optionalTrimmedString.optional(),
    ultimoCheckoutUrl: optionalTrimmedString.optional(),
    ultimoOrderNsu: optionalTrimmedString.optional(),
    ultimoInvoiceSlug: optionalTrimmedString.optional(),
    ultimaTransactionNsu: optionalTrimmedString.optional(),
    ultimoReceiptUrl: optionalTrimmedString.optional(),
    ultimoCheckoutPago: optionalBoolean.optional(),
    ultimoValorPago: optionalNumber.optional()
  })
}).superRefine((payload, ctx) => {
  const emails = payload.configuracao.emailsAlerta ?? [];
  emails.forEach((email, index) => {
    if (!validarEmail(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["configuracao", "emailsAlerta", index],
        message: "Informe um e-mail válido."
      });
    }
  });
});
