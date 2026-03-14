export type AutorizacaoCompraStatus =
  | "SOLICITADO"
  | "EM_ANALISE"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "REPROVADO"
  | "DEVOLVIDO_PARA_AJUSTE"
  | "EM_COTACAO"
  | "COTACAO_CONCLUIDA"
  | "FORNECEDOR_DEFINIDO"
  | "FORA_DO_ORCAMENTO"
  | "RESERVA_EFETUADA"
  | "RESERVA_CANCELADA"
  | "PAGAMENTO_AUTORIZADO"
  | "DESPESA_LANCADA"
  | "INTEGRADO_AO_ALMOXARIFADO"
  | "INTEGRADO_AO_PATRIMONIO"
  | "FINALIZADO"
  | "CANCELADO";

export type AutorizacaoCompraPrioridade = "urgente" | "normal" | "baixa";

export type AutorizacaoCompraTipoCompra =
  | "Material de consumo"
  | "Bens patrimoniais"
  | "Serviços";

export type AutorizacaoCompraItemPayload = {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorEstimado: number;
  categoria?: string;
  tipoItem: "material" | "bem" | "servico";
};

export type AutorizacaoCompraPayload = {
  numeroSolicitacao?: string;
  titulo?: string;
  solicitante: string;
  setorSolicitante: string;
  centroCusto: string;
  dataSolicitacao?: string;
  prioridade?: AutorizacaoCompraPrioridade | string;
  justificativa?: string;
  observacoes?: string;
  tipoCompra: AutorizacaoCompraTipoCompra;
  naturezaCompra?: string;
  dataPrevista?: string;
  status?: AutorizacaoCompraStatus | string;
  dispensarCotacao?: boolean;
  motivoDispensa?: string;
  autorizacaoEspecialOrcamento?: boolean;
  justificativaOrcamento?: string;
  orcamentoPrevisto?: number;
  registroPatrimonio?: boolean;
  registroAlmoxarifado?: boolean;
  itens: AutorizacaoCompraItemPayload[];
};

export type OrcamentoCompraResumo = {
  previsto: number;
  utilizado: number;
  saldoDisponivel: number;
  extrapola: boolean;
  autorizacaoEspecial: boolean;
  justificativa?: string;
};

export type AutorizacaoCompraSetorSolicitante = {
  valor: string;
  label: string;
  nome: string;
  unidadeNome?: string;
};

export type AutorizacaoPagamentoResumo = {
  numero?: string;
  autor?: string;
  data?: string;
  observacoes?: string;
  valorAutorizado?: number;
  vencimento?: string;
  formaPagamento?: string;
  contaPagadoraId?: number;
  documentoReferencia?: string;
  documentoFiscal?: string;
  lancamentoFinanceiroId?: number;
};

export type FornecedorResumo = {
  cotacaoId?: number;
  fornecedor: string;
  valor?: number;
};

export type AutorizacaoCompraResumo = {
  id: number;
  numeroSolicitacao?: string;
  titulo: string;
  solicitante?: string;
  setorSolicitante?: string;
  centroCusto?: string;
  dataSolicitacao?: string;
  tipoCompra: string;
  naturezaCompra?: string;
  prioridade: string;
  status: string;
  valorTotal: number;
  valorSolicitacao: number;
  orcamento: OrcamentoCompraResumo;
  numeroReserva?: string;
  autorizacaoPagamento: AutorizacaoPagamentoResumo;
  fornecedorSugerido?: FornecedorResumo;
  fornecedorEscolhido?: FornecedorResumo;
  flagExcecaoMenorPreco: boolean;
  justificativaExcecaoMenorPreco?: string;
  dispensarCotacao: boolean;
  motivoDispensa?: string;
  registroPatrimonio: boolean;
  registroAlmoxarifado: boolean;
  ativo: boolean;
  canceladoEm?: string;
  finalizadoEm?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type AutorizacaoCompraItem = AutorizacaoCompraItemPayload & {
  id: number;
  autorizacaoCompraId: number;
  valorTotalEstimado: number;
  ordem: number;
  ativo: boolean;
};

export type IndicadoresFornecedor = {
  quantidadeComprasAnteriores: number;
  valorTotalContratado: number;
  historicoAtrasos: number;
  indiceAtendimento: number;
  ultimasComprasRealizadas: Array<{
    id: number;
    numeroSolicitacao?: string;
    titulo: string;
    valor: number;
    status: string;
    data?: string;
  }>;
  mediaPrecoComparada: number;
};

export type AutorizacaoCotacaoPayload = {
  fornecedor: string;
  razaoSocial?: string;
  cnpj: string;
  contato: string;
  telefone?: string;
  email?: string;
  valor: number;
  prazoEntrega?: string;
  formaPagamento: string;
  validadeProposta: string;
  observacoes?: string;
  dataCotacao: string;
  orcamentoArquivoId?: number;
  cartaoCnpjArquivoId?: number;
};

export type AutorizacaoCotacao = AutorizacaoCotacaoPayload & {
  id: number;
  autorizacaoCompraId: number;
  ehMenorPreco: boolean;
  ehEscolhida: boolean;
  indicadoresFornecedor?: IndicadoresFornecedor;
  criadoEm: string;
  atualizadoEm: string;
};

export type NivelAprovacaoCompra = {
  id: number;
  codigo: string;
  nome: string;
  ordem: number;
  valorMinimo: number;
  valorMaximo?: number;
  permissaoRequerida: string;
  status: "pendente" | "aprovado" | "reprovado" | "devolvido";
  usuarioNome?: string;
  parecer?: string;
  motivo?: string;
  criadoEm?: string;
};

export type AprovacaoCompra = {
  id: number;
  autorizacaoCompraId: number;
  nivelId: number;
  nivelCodigo?: string;
  nivelNome?: string;
  decisao: string;
  parecer: string;
  observacao?: string;
  motivo?: string;
  usuarioId?: number;
  usuarioNome?: string;
  permissoes: string[];
  ip?: string;
  maquina?: string;
  criadoEm: string;
};

export type AprovacaoCompraPayload = {
  acao: "APROVAR" | "REPROVAR" | "DEVOLVER_AJUSTE";
  parecer: string;
  observacao?: string;
  motivo?: string;
};

export type EscolhaFornecedorPayload = {
  cotacaoId: number;
  justificativaDivergencia?: string;
};

export type ReservaBancariaPayload = {
  contaBancariaId: number;
  valor: number;
  observacao?: string;
};

export type ReservaBancaria = {
  id: number;
  autorizacaoCompraId: number;
  contaBancariaId: number;
  valor: number;
  status: string;
  observacao?: string;
  usuarioResponsavel?: string;
  canceladoEm?: string;
  criadoEm: string;
};

export type AutorizacaoPagamentoPayload = {
  valorAutorizado: number;
  vencimento: string;
  formaPagamento: string;
  contaPagadoraId: number;
  documentoReferencia?: string;
  documentoFiscal?: string;
  observacoes?: string;
  justificativaDivergencia?: string;
};

export type HistoricoCompra = {
  id: number;
  autorizacaoCompraId: number;
  acao: string;
  aba?: string;
  statusAnterior?: string;
  statusNovo?: string;
  observacao?: string;
  justificativa?: string;
  usuarioId?: number;
  usuarioNome?: string;
  perfil?: string;
  ip?: string;
  maquina?: string;
  criadoEm: string;
};

export type IntegracaoCompra = {
  id: number;
  autorizacaoCompraId: number;
  tipo: string;
  referenciaId?: string;
  status: string;
  detalhe?: string;
  usuarioId?: number;
  usuarioNome?: string;
  criadoEm: string;
};

export type AnexoCompra = {
  id: number;
  entidadeTipo: string;
  entidadeId?: number;
  categoria: string;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  mimeType: string;
  observacao?: string;
  dataUpload: string;
};

export type AutorizacaoCompraDetalhe = AutorizacaoCompraResumo & {
  itens: AutorizacaoCompraItem[];
  niveisAprovacao: NivelAprovacaoCompra[];
  aprovacoes: AprovacaoCompra[];
  cotacoes: AutorizacaoCotacao[];
  reservas: ReservaBancaria[];
  historico: HistoricoCompra[];
  integracoes: IntegracaoCompra[];
  anexos: AnexoCompra[];
};

export type FornecedorCnpj = {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  idConsulta?: string;
};

export type PainelComprasIndicadores = {
  aguardando_aprovacao: number;
  cotacoes_pendentes: number;
  sem_reserva: number;
  aguardando_pagamento: number;
  concluidas_periodo: number;
  fora_orcamento: number;
  excecao_menor_preco: number;
  aguardando_almoxarifado: number;
  aguardando_patrimonio: number;
};
