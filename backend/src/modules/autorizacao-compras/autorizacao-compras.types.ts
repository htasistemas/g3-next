export type AutorizacaoCompraInput = {
  titulo: string;
  tipo: string;
  area?: string | null;
  responsavel?: string | null;
  dataPrevista?: string | null;
  valor?: number | null;
  justificativa?: string | null;
  centroCusto?: string | null;
  status: string;
  aprovador?: string | null;
  decisao?: string | null;
  observacoesAprovacao?: string | null;
  dataAprovacao?: string | null;
  dispensarCotacao?: boolean;
  motivoDispensa?: string | null;
  vencedor?: string | null;
  registroPatrimonio?: boolean;
  registroAlmoxarifado?: boolean;
  numeroReserva?: string | null;
  numeroTermo?: string | null;
  autorizacaoPagamentoNumero?: string | null;
  autorizacaoPagamentoAutor?: string | null;
  autorizacaoPagamentoData?: string | null;
  autorizacaoPagamentoObservacoes?: string | null;
  prioridade?: string | null;
  quantidadeItens?: number | null;
};

export type AutorizacaoCompraCotacaoInput = {
  fornecedor: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  valor: number;
  prazoEntrega?: string | null;
  validade?: string | null;
  conformidade?: string | null;
  observacoes?: string | null;
  orcamentoFisicoNome?: string | null;
  orcamentoFisicoTipo?: string | null;
  orcamentoFisicoConteudo?: string | null;
  cartaoCnpjUrl?: string | null;
  cartaoCnpjNome?: string | null;
  cartaoCnpjTipo?: string | null;
  cartaoCnpjConteudo?: string | null;
};

export type ReservaBancariaInput = {
  contaBancariaId: number;
  valor: number;
};

export type AutorizacaoPagamentoInput = {
  autor?: string | null;
  data?: string | null;
  observacoes?: string | null;
};

export type AutorizacaoCompraRow = {
  id: bigint;
  titulo: string;
  tipo: string;
  area: string | null;
  responsavel: string | null;
  data_prevista: Date | null;
  valor: number | null;
  quantidade_itens: number;
  justificativa: string | null;
  centro_custo: string | null;
  prioridade: string;
  status: string;
  aprovador: string | null;
  decisao: string | null;
  observacoes_aprovacao: string | null;
  data_aprovacao: Date | null;
  dispensar_cotacao: boolean;
  motivo_dispensa: string | null;
  vencedor: string | null;
  registro_patrimonio: boolean;
  registro_almoxarifado: boolean;
  numero_reserva: string | null;
  numero_termo: string | null;
  autorizacao_pagamento_numero: string | null;
  autorizacao_pagamento_autor: string | null;
  autorizacao_pagamento_data: Date | null;
  autorizacao_pagamento_observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type AutorizacaoCompraCotacaoRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  fornecedor: string;
  razao_social: string | null;
  cnpj: string | null;
  valor: number;
  prazo_entrega: Date | null;
  validade: Date | null;
  conformidade: string | null;
  observacoes: string | null;
  orcamento_fisico_nome: string | null;
  orcamento_fisico_tipo: string | null;
  orcamento_fisico_conteudo: string | null;
  criado_em: Date;
  cartao_cnpj_url: string | null;
  cartao_cnpj_nome: string | null;
  cartao_cnpj_tipo: string | null;
  cartao_cnpj_conteudo: string | null;
};

export type AutorizacaoCompraReservaRow = {
  id: bigint;
  autorizacao_compra_id: bigint;
  conta_bancaria_id: bigint;
  valor: number;
  criado_em: Date;
};
