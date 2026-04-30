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

export type AutorizacaoCompraTipoItem = "material" | "bem" | "servico";

export type AutorizacaoCompraPrioridade = "urgente" | "normal" | "baixa";

export type AutorizacaoCompraAcaoAprovacao = "APROVAR" | "REPROVAR" | "DEVOLVER_AJUSTE";

export type AutorizacaoCompraTipoCompra =
  | "Material de consumo"
  | "Bens patrimoniais"
  | "Serviços";

export type AutorizacaoCompraTipoIntegracao =
  | "FINANCEIRO"
  | "ALMOXARIFADO"
  | "PATRIMONIO"
  | "SERVICO";

export type AutorizacaoCompraAtor = {
  usuarioId?: bigint;
  nomeUsuario?: string;
  permissoes?: string[];
  tenantId?: string;
  ip?: string | null;
  maquina?: string | null;
};

export type AutorizacaoCompraItemInput = {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorEstimado: number;
  categoria?: string | null;
  tipoItem: AutorizacaoCompraTipoItem;
};

export type AutorizacaoCompraInput = {
  numeroSolicitacao?: string | null;
  titulo?: string | null;
  solicitante: string;
  setorSolicitante: string;
  centroCusto: string;
  dataSolicitacao?: string | null;
  prioridade?: AutorizacaoCompraPrioridade | string | null;
  justificativa?: string | null;
  observacoes?: string | null;
  tipoCompra: AutorizacaoCompraTipoCompra;
  naturezaCompra?: string | null;
  dataPrevista?: string | null;
  status?: AutorizacaoCompraStatus | string | null;
  dispensarCotacao?: boolean;
  motivoDispensa?: string | null;
  autorizacaoEspecialOrcamento?: boolean;
  justificativaOrcamento?: string | null;
  orcamentoPrevisto?: number | null;
  registroPatrimonio?: boolean;
  registroAlmoxarifado?: boolean;
  itens: AutorizacaoCompraItemInput[];
};

export type AutorizacaoCompraCotacaoInput = {
  fornecedor: string;
  razaoSocial?: string | null;
  cnpj: string;
  contato: string;
  telefone?: string | null;
  email?: string | null;
  valor: number;
  prazoEntrega?: string | null;
  formaPagamento: string;
  validadeProposta: string;
  observacoes?: string | null;
  dataCotacao: string;
  orcamentoArquivoId?: number | null;
  cartaoCnpjArquivoId?: number | null;
};

export type AutorizacaoCompraEscolhaFornecedorInput = {
  cotacaoId: number;
  justificativaDivergencia?: string | null;
};

export type AutorizacaoCompraAprovacaoInput = {
  acao: AutorizacaoCompraAcaoAprovacao;
  parecer: string;
  observacao?: string | null;
  motivo?: string | null;
};

export type ReservaBancariaInput = {
  contaBancariaId: number;
  valor: number;
  observacao?: string | null;
};

export type AutorizacaoPagamentoInput = {
  valorAutorizado: number;
  vencimento: string;
  formaPagamento: string;
  contaPagadoraId: number;
  documentoReferencia?: string | null;
  documentoFiscal?: string | null;
  observacoes?: string | null;
  justificativaDivergencia?: string | null;
};

export type AutorizacaoCompraNivelAprovacaoRow = {
  id: bigint;
  codigo: string;
  nome: string;
  ordem: number;
  valor_minimo: number;
  valor_maximo: number | null;
  permissao_requerida: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraSetorSolicitanteRow = {
  nome: string;
  unidade_nome: string | null;
};

export type AutorizacaoCompraRow = {
  id: bigint;
  numero_solicitacao: string | null;
  titulo: string;
  tipo: string;
  area: string | null;
  responsavel: string | null;
  data_prevista: Date | null;
  data_solicitacao: Date | null;
  valor: number | null;
  valor_total_itens: number | null;
  quantidade_itens: number;
  justificativa: string | null;
  observacoes: string | null;
  centro_custo: string | null;
  prioridade: string;
  status: string;
  solicitante: string | null;
  setor_solicitante: string | null;
  natureza_compra: string | null;
  dispensar_cotacao: boolean;
  motivo_dispensa: string | null;
  vencedor: string | null;
  cotacao_vencedora_id: bigint | null;
  menor_preco_cotacao_id: bigint | null;
  menor_preco_fornecedor: string | null;
  menor_preco_valor: number | null;
  justificativa_excecao_menor_preco: string | null;
  flag_excecao_menor_preco: boolean;
  registro_patrimonio: boolean;
  registro_almoxarifado: boolean;
  numero_reserva: string | null;
  numero_termo: string | null;
  autorizacao_pagamento_numero: string | null;
  autorizacao_pagamento_autor: string | null;
  autorizacao_pagamento_data: Date | null;
  autorizacao_pagamento_observacoes: string | null;
  pagamento_autorizado_valor: number | null;
  pagamento_vencimento: Date | null;
  pagamento_forma: string | null;
  conta_pagadora_id: bigint | null;
  documento_referencia: string | null;
  documento_fiscal: string | null;
  lancamento_financeiro_id: bigint | null;
  orcamento_previsto: number | null;
  orcamento_utilizado: number | null;
  orcamento_saldo: number | null;
  valor_solicitacao: number | null;
  extrapola_orcamento: boolean;
  autorizacao_especial_orcamento: boolean;
  justificativa_orcamento: string | null;
  ativo: boolean;
  cancelado_em: Date | null;
  finalizado_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraItemRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_estimado: number;
  categoria: string | null;
  tipo_item: string;
  ordem: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraCotacaoRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  fornecedor: string;
  razao_social: string | null;
  cnpj: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  valor: number;
  prazo_entrega: Date | null;
  forma_pagamento: string | null;
  validade: Date | null;
  observacoes: string | null;
  data_cotacao: Date | null;
  orcamento_arquivo_id: bigint | null;
  cartao_cnpj_arquivo_id: bigint | null;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraReservaRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  conta_bancaria_id: bigint;
  valor: number;
  status: string;
  observacao: string | null;
  usuario_responsavel: string | null;
  cancelado_em: Date | null;
  criado_em: Date;
};

export type AutorizacaoCompraAprovacaoRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  nivel_id: bigint;
  decisao: string;
  parecer: string;
  observacao: string | null;
  motivo: string | null;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  permissoes_json: unknown;
  ip: string | null;
  maquina: string | null;
  criado_em: Date;
};

export type AutorizacaoCompraHistoricoRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  acao: string;
  aba: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  observacao: string | null;
  justificativa: string | null;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  perfil: string | null;
  ip: string | null;
  maquina: string | null;
  criado_em: Date;
};

export type AutorizacaoCompraIntegracaoRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  tipo: string;
  referencia_id: string | null;
  status: string;
  detalhe: string | null;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  criado_em: Date;
};

export type AutorizacaoCompraOrcamentoRow = {
  id: bigint;
  setor_solicitante: string;
  centro_custo: string;
  orcamento_previsto: number;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraPainelRow = {
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

export type FornecedorIndicadoresCompraAnteriorRow = {
  id: bigint;
  numero_solicitacao: string | null;
  titulo: string;
  valor_total_itens: number | null;
  pagamento_autorizado_valor: number | null;
  data_solicitacao: Date | null;
  finalizado_em: Date | null;
  status: string;
};
