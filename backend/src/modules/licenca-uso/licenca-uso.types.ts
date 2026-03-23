export const licencaUsoPlanos = ["essencial", "profissional", "premium", "enterprise"] as const;
export const licencaUsoCiclos = ["mensal", "semestral", "anual"] as const;
export const licencaUsoStatus = ["ativa", "vence_hoje", "vencida", "sem_vigencia"] as const;

export type LicencaUsoPlano = (typeof licencaUsoPlanos)[number];
export type LicencaUsoCiclo = (typeof licencaUsoCiclos)[number];
export type LicencaUsoStatus = (typeof licencaUsoStatus)[number];

export type LicencaUsoConfiguracao = {
  instituicaoNome?: string;
  instituicaoCnpj?: string;
  planoId: LicencaUsoPlano;
  cicloCobranca: LicencaUsoCiclo;
  vigenciaInicialDias?: number;
  valorBaseMensal: number;
  percentualDesconto: number;
  valorCobranca: number;
  valorImplantacao: number;
  implantacaoIsenta: boolean;
  dataInicioVigencia?: string;
  dataVencimento?: string;
  statusLicenca: LicencaUsoStatus;
  alertasEmailAtivos: boolean;
  diasAlertaEmail: number[];
  emailsAlerta: string[];
  observacoes?: string;
  pixChave?: string;
  pixRecebedor?: string;
  pixCidade?: string;
  pixAmbiente: "sandbox" | "producao";
  pixWebhookUrl?: string;
  pixExpiracaoMinutos: number;
  pixProvider: string;
  cartaoProvider: string;
  cartaoAmbiente: "sandbox" | "producao";
  cartaoChavePublica?: string;
  cartaoChavePrivadaRef?: string;
  cartaoTentativasFalha: number;
  boletoProvider: string;
  boletoAmbiente: "sandbox" | "producao";
  boletoPrazoVencimentoDias: number;
  boletoInstrucao?: string;
  mensagemCobranca?: string;
  checkoutHandle?: string;
  checkoutRedirectUrl?: string;
  ultimoCheckoutUrl?: string;
  ultimoOrderNsu?: string;
  ultimoInvoiceSlug?: string;
  ultimaTransactionNsu?: string;
  ultimoReceiptUrl?: string;
  ultimoCheckoutPago?: boolean;
  ultimoValorPago?: number;
};

export type LicencaUsoConfiguracaoInput = Partial<LicencaUsoConfiguracao>;

export type LicencaUsoResumo = {
  diasParaVencimento?: number;
  proximoAlertaDias?: number;
  bloqueiaSistema: false;
};

export type LicencaUsoPagamentoStatus = "pendente" | "pago" | "cancelado";

export type LicencaUsoPagamentoHistorico = {
  id: number;
  status: LicencaUsoPagamentoStatus;
  descricao: string;
  planoId: LicencaUsoPlano;
  cicloCobranca: LicencaUsoCiclo;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  vigenciaDias?: number;
  valorLicenca: number;
  valorImplantacao: number;
  valorTotal: number;
  orderNsu?: string;
  invoiceSlug?: string;
  transactionNsu?: string;
  checkoutUrl?: string;
  receiptUrl?: string;
  criadoEm?: string;
  pagoEm?: string;
};

export type LicencaUsoAlertaProcessado = {
  destinatario: string;
  diasAntecedencia: number;
  referenciaVencimento: string;
  statusEnvio: "enviado" | "falha";
  erro?: string;
};
