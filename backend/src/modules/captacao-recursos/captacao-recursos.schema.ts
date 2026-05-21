import { z } from "zod";
import {
  normalizarCnpj,
  normalizarCpf,
  normalizarEmail,
  normalizarTelefone,
  validarCnpj,
  validarCpf,
  validarEmail
} from "../../utils/br-utils.js";
import {
  captacaoCategoriaDoadorValues,
  captacaoFormaPagamentoValues,
  captacaoOrigemDoacaoValues,
  captacaoPeriodicidadeValues,
  captacaoSituacaoDoacaoValues,
  captacaoStatusCampanhaValues,
  captacaoStatusDoadorValues,
  captacaoStatusRecorrenciaValues,
  captacaoTipoCampanhaValues,
  captacaoTipoDoacaoValues,
  captacaoTipoDoadorValues
} from "./captacao-recursos.types.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }
  return value;
}, z.number().optional());

const optionalInteger = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  return value;
}, z.number().int().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "sim", "yes"].includes(normalized)) return true;
    if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const optionalIsoDate = z
  .preprocess((value) => {
    if (value == null || value === "") return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const br = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/u);
    if (br) {
      return `${br[3]}-${br[2]}-${br[1]}`;
    }
    return trimmed;
  }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "Informe a data no formato ISO.").optional());

export const captacaoListFiltersSchema = z.object({
  termo: optionalTrimmedString.optional(),
  pagina: optionalInteger.optional(),
  limite: optionalInteger.optional(),
  periodoInicio: optionalIsoDate.optional(),
  periodoFim: optionalIsoDate.optional(),
  campanhaId: optionalTrimmedString.optional(),
  doadorId: optionalTrimmedString.optional(),
  formaPagamento: optionalTrimmedString.optional(),
  situacao: optionalTrimmedString.optional(),
  origem: optionalTrimmedString.optional(),
  responsavel: optionalTrimmedString.optional(),
  tipoDoacao: optionalTrimmedString.optional(),
  tipoDoador: optionalTrimmedString.optional(),
  status: optionalTrimmedString.optional(),
  unidadeId: optionalTrimmedString.optional()
});

export const captacaoDoadorInputSchema = z
  .object({
    tipoDoador: z.enum(captacaoTipoDoadorValues),
    nome: z.string().trim().min(3, "Informe o nome do doador."),
    nomeFantasia: optionalTrimmedString.optional(),
    cpfCnpj: optionalTrimmedString.optional(),
    dataNascimentoFundacao: optionalIsoDate.optional(),
    emailPrincipal: optionalTrimmedString.optional(),
    emailSecundario: optionalTrimmedString.optional(),
    telefone: optionalTrimmedString.optional(),
    whatsapp: optionalTrimmedString.optional(),
    enderecoCompleto: optionalTrimmedString.optional(),
    bairro: optionalTrimmedString.optional(),
    cidade: optionalTrimmedString.optional(),
    uf: optionalTrimmedString.optional(),
    cep: optionalTrimmedString.optional(),
    observacoes: optionalTrimmedString.optional(),
    origemCadastro: optionalTrimmedString.optional(),
    status: z.enum(captacaoStatusDoadorValues).default("ativo"),
    aceitouLgpd: optionalBoolean.default(false),
    dataAceiteLgpd: optionalIsoDate.optional(),
    aceitaEmail: optionalBoolean.default(true),
    aceitaWhatsapp: optionalBoolean.default(true),
    aceitaReceberCampanhas: optionalBoolean.default(true),
    categoriaDoador: z.enum(captacaoCategoriaDoadorValues).optional(),
    segmentoRelacionamento: optionalTrimmedString.optional(),
    statusRetencao: optionalTrimmedString.optional(),
    motivoRisco: optionalTrimmedString.optional(),
    proximaAcaoSugerida: optionalTrimmedString.optional(),
    scoreRelacionamento: optionalInteger.optional(),
    responsavelRelacionamento: optionalTrimmedString.optional(),
    observacoesInternas: optionalTrimmedString.optional(),
    portalAtivo: optionalBoolean.default(true),
    anexoPrincipalCaminho: optionalTrimmedString.optional()
  })
  .superRefine((input, ctx) => {
    const documento = (input.cpfCnpj ?? "").replace(/\D/g, "");
    if (input.tipoDoador === "pessoa_fisica" && documento && !validarCpf(normalizarCpf(documento))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpfCnpj"],
        message: "Informe um CPF válido."
      });
    }
    if (
      ["pessoa_juridica", "patrocinador", "parceiro"].includes(input.tipoDoador) &&
      documento &&
      documento.length === 14 &&
      !validarCnpj(normalizarCnpj(documento))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpfCnpj"],
        message: "Informe um CNPJ válido."
      });
    }
    if (input.emailPrincipal && !validarEmail(normalizarEmail(input.emailPrincipal))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailPrincipal"],
        message: "Informe um e-mail válido."
      });
    }
    if (input.emailSecundario && !validarEmail(normalizarEmail(input.emailSecundario))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emailSecundario"],
        message: "Informe um e-mail válido."
      });
    }
    if (input.uf && input.uf.trim().length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uf"],
        message: "Informe a UF com 2 letras."
      });
    }
    if (input.telefone) {
      const digits = normalizarTelefone(input.telefone);
      if (digits && ![10, 11].includes(digits.length)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["telefone"],
          message: "Informe um telefone válido."
        });
      }
    }
    if (input.whatsapp) {
      const digits = normalizarTelefone(input.whatsapp);
      if (digits && ![10, 11, 12, 13].includes(digits.length)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["whatsapp"],
          message: "Informe um WhatsApp válido."
        });
      }
    }
  });

export const captacaoTarefaRelacionamentoInputSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título da tarefa."),
  descricao: optionalTrimmedString.optional(),
  status: optionalTrimmedString.default("pendente"),
  prioridade: optionalTrimmedString.default("media"),
  tipo: optionalTrimmedString.default("follow_up"),
  responsavel: optionalTrimmedString.optional(),
  dataPrevista: optionalIsoDate.optional(),
  origem: optionalTrimmedString.default("manual")
});

export const captacaoCampanhaInputSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome da campanha."),
  descricaoCurta: optionalTrimmedString.optional(),
  descricaoCompleta: optionalTrimmedString.optional(),
  objetivo: optionalTrimmedString.optional(),
  metaFinanceira: optionalNumber.optional(),
  dataInicial: optionalIsoDate.optional(),
  dataFinal: optionalIsoDate.optional(),
  status: z.enum(captacaoStatusCampanhaValues).default("rascunho"),
  imagemBanner: optionalTrimmedString.optional(),
  corDestaque: z
    .preprocess((value) => {
      if (value == null || value === "") return undefined;
      return value;
    }, z.string().regex(/^#[0-9a-fA-F]{6}$/u, "Informe uma cor válida.").optional()),
  tipo: z.enum(captacaoTipoCampanhaValues),
  responsavel: optionalTrimmedString.optional(),
  destaqueNoPortal: optionalBoolean.default(false),
  visivelAoPublico: optionalBoolean.default(false),
  urlPublica: optionalTrimmedString.optional(),
  qrCodePublico: optionalTrimmedString.optional(),
  mensagemAgradecimento: optionalTrimmedString.optional()
});

export const captacaoRecorrenciaSchema = z.object({
  valorRecorrente: z.coerce.number().positive("Informe o valor da recorrência."),
  periodicidade: z.enum(captacaoPeriodicidadeValues),
  formaPagamento: z.enum(captacaoFormaPagamentoValues),
  dataProximaCobranca: optionalIsoDate.optional(),
  quantidadeCiclos: optionalInteger.optional(),
  semPrevisaoTermino: optionalBoolean.default(false),
  status: z.enum(captacaoStatusRecorrenciaValues).default("ativa")
});

export const captacaoDoacaoInputSchema = z.object({
  doadorId: optionalTrimmedString.optional(),
  campanhaId: optionalTrimmedString.optional(),
  valor: z.coerce.number().positive("Informe o valor da doação."),
  valorLiquido: optionalNumber.optional(),
  valorTaxas: optionalNumber.optional(),
  tipoDoacao: z.enum(captacaoTipoDoacaoValues),
  formaPagamento: z.enum(captacaoFormaPagamentoValues),
  situacao: z.enum(captacaoSituacaoDoacaoValues).default("pendente"),
  origem: z.enum(captacaoOrigemDoacaoValues).default("administrativo"),
  identificadorExterno: optionalTrimmedString.optional(),
  txid: optionalTrimmedString.optional(),
  linkPagamento: optionalTrimmedString.optional(),
  dataVencimento: optionalIsoDate.optional(),
  observacoesInternas: optionalTrimmedString.optional(),
  usuarioResponsavel: optionalTrimmedString.optional(),
  comprovanteGerado: optionalBoolean.default(false),
  recorrenciaId: optionalTrimmedString.optional(),
  recorrencia: captacaoRecorrenciaSchema.optional()
});

export const captacaoConfiguracoesSchema = z.object({
  moduloHabilitado: optionalBoolean.optional(),
  portalDoadorHabilitado: optionalBoolean.optional(),
  campanhasPublicasHabilitadas: optionalBoolean.optional(),
  doacoesRecorrentesHabilitadas: optionalBoolean.optional(),
  envioAutomaticoComprovantes: optionalBoolean.optional(),
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
  mensagemAgradecimento: optionalTrimmedString.optional(),
  modeloComprovante: optionalTrimmedString.optional(),
  modeloEmailCobranca: optionalTrimmedString.optional(),
  modeloLembrete: optionalTrimmedString.optional(),
  modeloCampanha: optionalTrimmedString.optional(),
  lgpdTermoConsentimento: optionalTrimmedString.optional(),
  lgpdPoliticaPrivacidade: optionalTrimmedString.optional(),
  lgpdBaseLegal: optionalTrimmedString.optional()
});

export const captacaoAcaoDoacaoSchema = z.object({
  observacao: optionalTrimmedString.optional()
});

export const captacaoPortalLoginSchema = z.object({
  email: z.string().trim().min(3).transform((value) => normalizarEmail(value)),
  documento: z.string().trim().min(3)
});

export const captacaoPortalTokenSchema = z.object({
  token: z.string().trim().min(10)
});
