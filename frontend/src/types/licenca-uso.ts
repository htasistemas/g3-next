export type LicencaUsoPlanoId = "essencial" | "profissional" | "premium" | "enterprise";
export type LicencaUsoCiclo = "mensal" | "semestral" | "anual";
export type LicencaUsoStatus = "ativa" | "vence_hoje" | "vencida" | "sem_vigencia";

export type LicencaUsoConfiguracao = {
  instituicaoNome?: string;
  instituicaoCnpj?: string;
  planoId: LicencaUsoPlanoId;
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
  planoId: LicencaUsoPlanoId;
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

export type LicencaUsoResponse = {
  configuracao: LicencaUsoConfiguracao;
  resumo: LicencaUsoResumo;
  historico: {
    pendentes: LicencaUsoPagamentoHistorico[];
    realizados: LicencaUsoPagamentoHistorico[];
  };
  atualizado_em?: string | null;
};

export type LicencaUsoCheckoutResponse = {
  configuracao: LicencaUsoConfiguracao;
  resumo: LicencaUsoResumo;
  historico: {
    pendentes: LicencaUsoPagamentoHistorico[];
    realizados: LicencaUsoPagamentoHistorico[];
  };
  checkoutUrl?: string;
  orderNsu?: string;
  invoiceSlug?: string;
};

export type LicencaUsoRetornoCheckoutResponse = {
  pago: boolean;
  configuracao: LicencaUsoConfiguracao;
  resumo: LicencaUsoResumo;
  historico: {
    pendentes: LicencaUsoPagamentoHistorico[];
    realizados: LicencaUsoPagamentoHistorico[];
  };
  retorno: Record<string, unknown>;
};
