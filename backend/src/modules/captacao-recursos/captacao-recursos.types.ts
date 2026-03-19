export const captacaoTipoDoadorValues = [
  "pessoa_fisica",
  "pessoa_juridica",
  "anonimo",
  "mantenedor",
  "patrocinador",
  "parceiro"
] as const;

export const captacaoStatusDoadorValues = ["ativo", "inativo", "prospecto"] as const;
export const captacaoCategoriaDoadorValues = [
  "individual",
  "empresarial",
  "institucional",
  "mantenedor",
  "parceiro",
  "patrocinador"
] as const;
export const captacaoTipoDoacaoValues = [
  "unica",
  "recorrente",
  "espontanea",
  "campanha",
  "evento",
  "patrocinio"
] as const;
export const captacaoFormaPagamentoValues = ["pix", "cartao", "boleto"] as const;
export const captacaoSituacaoDoacaoValues = [
  "pendente",
  "aguardando_pagamento",
  "pago",
  "confirmado",
  "cancelado",
  "vencido",
  "expirado",
  "estornado",
  "falha_pagamento"
] as const;
export const captacaoOrigemDoacaoValues = [
  "administrativo",
  "portal_doador",
  "campanha_publica",
  "link_direto",
  "qr_code",
  "evento"
] as const;
export const captacaoStatusCampanhaValues = ["rascunho", "ativa", "pausada", "encerrada"] as const;
export const captacaoTipoCampanhaValues = [
  "institucional",
  "emergencial",
  "sazonal",
  "projeto_social",
  "evento",
  "manutencao"
] as const;
export const captacaoPeriodicidadeValues = [
  "mensal",
  "bimestral",
  "trimestral",
  "semestral",
  "anual"
] as const;
export const captacaoStatusRecorrenciaValues = [
  "ativa",
  "pausada",
  "cancelada",
  "falhou",
  "encerrada"
] as const;
export const captacaoPortalSituacaoValues = ["desabilitado", "ativo"] as const;

export const captacaoPermissions = [
  "CAPTACAO_DASHBOARD_VISUALIZAR",
  "CAPTACAO_DOADORES_VISUALIZAR",
  "CAPTACAO_DOADORES_CADASTRAR",
  "CAPTACAO_DOADORES_EDITAR",
  "CAPTACAO_DOADORES_INATIVAR",
  "CAPTACAO_DOACOES_VISUALIZAR",
  "CAPTACAO_DOACOES_CADASTRAR",
  "CAPTACAO_DOACOES_CONFIRMAR",
  "CAPTACAO_DOACOES_CANCELAR",
  "CAPTACAO_DOACOES_ESTORNAR",
  "CAPTACAO_COBRANCAS_GERAR",
  "CAPTACAO_COMPROVANTES_EMITIR",
  "CAPTACAO_COMPROVANTES_REENVIAR",
  "CAPTACAO_CAMPANHAS_CRIAR",
  "CAPTACAO_CAMPANHAS_EDITAR",
  "CAPTACAO_CAMPANHAS_PAUSAR",
  "CAPTACAO_CAMPANHAS_ENCERRAR",
  "CAPTACAO_PORTAL_ACESSAR",
  "CAPTACAO_CONFIGURAR",
  "CAPTACAO_RELATORIOS_VISUALIZAR",
  "CAPTACAO_RELATORIOS_EXPORTAR",
  "CAPTACAO_DADOS_SENSIVEIS_VISUALIZAR"
] as const;

export type CaptacaoTipoDoador = (typeof captacaoTipoDoadorValues)[number];
export type CaptacaoStatusDoador = (typeof captacaoStatusDoadorValues)[number];
export type CaptacaoCategoriaDoador = (typeof captacaoCategoriaDoadorValues)[number];
export type CaptacaoTipoDoacao = (typeof captacaoTipoDoacaoValues)[number];
export type CaptacaoFormaPagamento = (typeof captacaoFormaPagamentoValues)[number];
export type CaptacaoSituacaoDoacao = (typeof captacaoSituacaoDoacaoValues)[number];
export type CaptacaoOrigemDoacao = (typeof captacaoOrigemDoacaoValues)[number];
export type CaptacaoStatusCampanha = (typeof captacaoStatusCampanhaValues)[number];
export type CaptacaoTipoCampanha = (typeof captacaoTipoCampanhaValues)[number];
export type CaptacaoPeriodicidade = (typeof captacaoPeriodicidadeValues)[number];
export type CaptacaoStatusRecorrencia = (typeof captacaoStatusRecorrenciaValues)[number];

export type CaptacaoListFilters = {
  termo?: string;
  pagina?: string | number;
  limite?: string | number;
  periodoInicio?: string;
  periodoFim?: string;
  campanhaId?: string;
  doadorId?: string;
  formaPagamento?: CaptacaoFormaPagamento | string;
  situacao?: CaptacaoSituacaoDoacao | string;
  origem?: CaptacaoOrigemDoacao | string;
  responsavel?: string;
  tipoDoacao?: CaptacaoTipoDoacao | string;
  tipoDoador?: CaptacaoTipoDoador | string;
  status?: string;
  unidadeId?: string;
};

export type CaptacaoDoadorInput = {
  tipoDoador: CaptacaoTipoDoador;
  nome: string;
  nomeFantasia?: string;
  cpfCnpj?: string;
  dataNascimentoFundacao?: string;
  emailPrincipal?: string;
  emailSecundario?: string;
  telefone?: string;
  whatsapp?: string;
  enderecoCompleto?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
  origemCadastro?: string;
  status: CaptacaoStatusDoador;
  aceitouLgpd: boolean;
  dataAceiteLgpd?: string;
  aceitaEmail: boolean;
  aceitaWhatsapp: boolean;
  aceitaReceberCampanhas: boolean;
  categoriaDoador?: CaptacaoCategoriaDoador;
  responsavelRelacionamento?: string;
  observacoesInternas?: string;
  portalAtivo?: boolean;
  anexoPrincipalCaminho?: string;
};

export type CaptacaoCampanhaInput = {
  nome: string;
  descricaoCurta?: string;
  descricaoCompleta?: string;
  objetivo?: string;
  metaFinanceira?: number;
  dataInicial?: string;
  dataFinal?: string;
  status: CaptacaoStatusCampanha;
  imagemBanner?: string;
  corDestaque?: string;
  tipo: CaptacaoTipoCampanha;
  responsavel?: string;
  destaqueNoPortal: boolean;
  visivelAoPublico: boolean;
  urlPublica?: string;
  qrCodePublico?: string;
  mensagemAgradecimento?: string;
};

export type CaptacaoDoacaoInput = {
  doadorId?: string;
  campanhaId?: string;
  valor: number;
  valorLiquido?: number;
  valorTaxas?: number;
  tipoDoacao: CaptacaoTipoDoacao;
  formaPagamento: CaptacaoFormaPagamento;
  situacao: CaptacaoSituacaoDoacao;
  origem: CaptacaoOrigemDoacao;
  identificadorExterno?: string;
  txid?: string;
  linkPagamento?: string;
  dataVencimento?: string;
  observacoesInternas?: string;
  usuarioResponsavel?: string;
  comprovanteGerado?: boolean;
  recorrenciaId?: string;
  recorrencia?: {
    valorRecorrente: number;
    periodicidade: CaptacaoPeriodicidade;
    formaPagamento: CaptacaoFormaPagamento;
    dataProximaCobranca?: string;
    quantidadeCiclos?: number;
    semPrevisaoTermino?: boolean;
    status: CaptacaoStatusRecorrencia;
  };
};

export type CaptacaoConfiguracoesInput = {
  moduloHabilitado?: boolean;
  portalDoadorHabilitado?: boolean;
  campanhasPublicasHabilitadas?: boolean;
  doacoesRecorrentesHabilitadas?: boolean;
  envioAutomaticoComprovantes?: boolean;
  pixChave?: string;
  pixRecebedor?: string;
  pixCidade?: string;
  pixAmbiente?: "sandbox" | "producao";
  pixWebhookUrl?: string;
  pixExpiracaoMinutos?: number;
  pixProvider?: string;
  cartaoProvider?: string;
  cartaoAmbiente?: "sandbox" | "producao";
  cartaoChavePublica?: string;
  cartaoChavePrivadaRef?: string;
  cartaoTentativasFalha?: number;
  boletoProvider?: string;
  boletoAmbiente?: "sandbox" | "producao";
  boletoPrazoVencimentoDias?: number;
  boletoInstrucao?: string;
  mensagemAgradecimento?: string;
  modeloComprovante?: string;
  modeloEmailCobranca?: string;
  modeloLembrete?: string;
  modeloCampanha?: string;
  lgpdTermoConsentimento?: string;
  lgpdPoliticaPrivacidade?: string;
  lgpdBaseLegal?: string;
};

export type PaymentChargeInput = {
  donationNumber: string;
  amount: number;
  donorName: string;
  paymentMethod: CaptacaoFormaPagamento;
  dueDate?: string;
  campaignName?: string;
  recurring?: boolean;
};

export type PaymentChargeResult = {
  provider: string;
  externalId: string;
  status: CaptacaoSituacaoDoacao;
  txid?: string;
  paymentLink?: string;
  qrCodeCopiaCola?: string;
  qrCodeSvg?: string;
  linhaDigitavel?: string;
  codigoBarras?: string;
  nossoNumero?: string;
  dueDate?: string;
  expiresAt?: string;
  cardReference?: string;
  payloadJson: Record<string, unknown>;
};
