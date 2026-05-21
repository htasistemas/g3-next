export type CaptacaoFormaPagamento = "pix" | "cartao" | "boleto";
export type CaptacaoSituacaoDoacao =
  | "pendente"
  | "aguardando_pagamento"
  | "pago"
  | "confirmado"
  | "cancelado"
  | "vencido"
  | "expirado"
  | "estornado"
  | "falha_pagamento";

export type CaptacaoDashboardResponse = {
  indicadores: {
    totalArrecadadoDia: number;
    totalArrecadadoMes: number;
    totalArrecadadoAno: number;
    quantidadeDoacoesRecebidas: number;
    ticketMedio: number;
    quantidadeDoadoresAtivos: number;
    quantidadeCampanhasAtivas: number;
    campanhaMaiorArrecadacao?: string;
    doacoesPendentes: number;
    doacoesConfirmadas: number;
    doacoesCanceladas: number;
    recorrenciasAtivas: number;
    doacoesEstornadas: number;
  };
  graficos: {
    arrecadacaoPorMes: Array<{ mes: string; valor: number }>;
    arrecadacaoPorFormaPagamento: Array<{ label: string; valor: number }>;
    doacoesPorOrigem: Array<{ label: string; valor: number }>;
    doacoesPorCampanha: Array<{ label: string; valor: number }>;
    metaPorCampanha: Array<{ label: string; meta: number; arrecadado: number }>;
    evolucaoNovosDoadores: Array<{ mes: string; quantidade: number }>;
    recorrenciasAtivasPorMes: Array<{ mes: string; quantidade: number }>;
    topDoadores: Array<{ label: string; valor: number }>;
    topCampanhas: Array<{ label: string; valor: number }>;
  };
};

export type CaptacaoListFilters = {
  termo?: string;
  pagina?: number;
  limite?: number;
  periodoInicio?: string;
  periodoFim?: string;
  campanhaId?: string;
  doadorId?: string;
  formaPagamento?: string;
  situacao?: string;
  origem?: string;
  responsavel?: string;
  tipoDoacao?: string;
  tipoDoador?: string;
  status?: string;
};

export type CaptacaoDoador = {
  id: string;
  uuid: string;
  tipoDoador: string;
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
  status: string;
  aceitouLgpd: boolean;
  dataAceiteLgpd?: string;
  aceitaEmail: boolean;
  aceitaWhatsapp: boolean;
  aceitaReceberCampanhas: boolean;
  categoriaDoador?: string;
  segmentoRelacionamento?: string;
  statusRetencao?: string;
  motivoRisco?: string;
  proximaAcaoSugerida?: string;
  scoreRelacionamento?: number;
  responsavelRelacionamento?: string;
  observacoesInternas?: string;
  portalAtivo: boolean;
  anexoPrincipalCaminho?: string;
  totalDoado: number;
  quantidadeDoacoes: number;
  ticketMedio: number;
  ultimaDoacao?: string;
  maiorDoacao: number;
  campanhasApoiadas: number;
  recorrenciaAtiva: boolean;
};

export type CaptacaoTarefaRelacionamento = {
  id: string;
  uuid: string;
  doadorId: string;
  titulo: string;
  descricao?: string;
  status: string;
  prioridade: string;
  tipo: string;
  responsavel?: string;
  dataPrevista?: string;
  concluidaEm?: string;
  origem: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CaptacaoCampanha = {
  id: string;
  uuid: string;
  nome: string;
  descricaoCurta?: string;
  descricaoCompleta?: string;
  objetivo?: string;
  metaFinanceira: number;
  valorArrecadado: number;
  percentualAtingido: number;
  valorFaltante: number;
  dataInicial?: string;
  dataFinal?: string;
  status: string;
  imagemBanner?: string;
  corDestaque: string;
  tipo: string;
  responsavel?: string;
  destaqueNoPortal: boolean;
  visivelAoPublico: boolean;
  urlPublica?: string;
  qrCodePublico?: string;
  mensagemAgradecimento?: string;
  totalDoacoes: number;
  totalDoadores: number;
  diasRestantes?: number;
  metaAtingida: boolean;
};

export type CaptacaoRecorrencia = {
  id: string;
  uuid: string;
  doadorId?: string;
  campanhaId?: string;
  campanhaNome?: string;
  valorRecorrente: number;
  periodicidade: string;
  formaPagamento: string;
  dataProximaCobranca?: string;
  quantidadeCiclos?: number;
  ciclosPagos: number;
  semPrevisaoTermino: boolean;
  status: string;
  referenciaExterna?: string;
};

export type CaptacaoDoacao = {
  id: string;
  uuid: string;
  numeroDoacao: string;
  dataHora?: string;
  doadorId?: string;
  doadorNome?: string;
  campanhaId?: string;
  campanhaNome?: string;
  recorrenciaId?: string;
  recorrenciaStatus?: string;
  valor: number;
  valorLiquido: number;
  valorTaxas: number;
  tipoDoacao: string;
  formaPagamento: CaptacaoFormaPagamento;
  situacao: CaptacaoSituacaoDoacao;
  origem: string;
  identificadorExterno?: string;
  txid?: string;
  linkPagamento?: string;
  dataVencimento?: string;
  observacoesInternas?: string;
  usuarioResponsavel?: string;
  comprovanteGerado: boolean;
  qrCodeSvg?: string;
  payloadPix?: string;
  linhaDigitavel?: string;
  codigoBarras?: string;
  cartaoReferencia?: string;
};

export type CaptacaoComprovante = {
  id: string;
  uuid: string;
  doacaoId?: string;
  doadorId?: string;
  campanhaId?: string;
  numeroComprovante: string;
  codigoValidacao: string;
  arquivoCaminho?: string;
  enviadoEmail: boolean;
  dataEnvioEmail?: string;
  mensagemAgradecimento?: string;
  numeroDoacao?: string;
  valorLiquido: number;
  formaPagamento?: string;
  dataHora?: string;
  doadorNome?: string;
  campanhaNome?: string;
};

export type CaptacaoConfiguracoes = {
  moduloHabilitado: boolean;
  portalDoadorHabilitado: boolean;
  campanhasPublicasHabilitadas: boolean;
  doacoesRecorrentesHabilitadas: boolean;
  envioAutomaticoComprovantes: boolean;
  pixChave?: string;
  pixRecebedor?: string;
  pixCidade?: string;
  pixAmbiente: string;
  pixWebhookUrl?: string;
  pixExpiracaoMinutos: number;
  pixProvider: string;
  cartaoProvider: string;
  cartaoAmbiente: string;
  cartaoChavePublica?: string;
  cartaoChavePrivadaRef?: string;
  cartaoTentativasFalha: number;
  boletoProvider: string;
  boletoAmbiente: string;
  boletoPrazoVencimentoDias: number;
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

export type CaptacaoLogItem = {
  id: string;
  entidadeTipo: string;
  entidadeId?: string;
  acao: string;
  descricao: string;
  detalhesJson: Record<string, unknown>;
  createdAt?: string;
  createdBy?: string;
};

export type CaptacaoPortalPainel = {
  doador: CaptacaoDoador;
  doacoes: CaptacaoDoacao[];
  comprovantes: CaptacaoComprovante[];
  recorrencias: CaptacaoRecorrencia[];
  campanhas: CaptacaoCampanha[];
};
