export type PrioridadeAutorizacao = "urgente" | "normal" | "baixa";

export type AutorizacaoCompraPayload = {
  titulo: string;
  tipo: string;
  area?: string;
  responsavel?: string;
  dataPrevista?: string;
  valor?: number;
  quantidadeItens?: number;
  justificativa?: string;
  centroCusto?: string;
  prioridade?: PrioridadeAutorizacao | string;
  status: string;
  aprovador?: string;
  decisao?: string;
  observacoesAprovacao?: string;
  dataAprovacao?: string;
  dispensarCotacao?: boolean;
  motivoDispensa?: string;
  vencedor?: string;
  registroPatrimonio?: boolean;
  registroAlmoxarifado?: boolean;
  numeroReserva?: string;
  numeroTermo?: string;
  autorizacaoPagamentoNumero?: string;
  autorizacaoPagamentoAutor?: string;
  autorizacaoPagamentoData?: string;
  autorizacaoPagamentoObservacoes?: string;
};

export type AutorizacaoCompra = AutorizacaoCompraPayload & {
  id: number;
  criadoEm: string;
  atualizadoEm: string;
};

export type AutorizacaoCotacaoPayload = {
  fornecedor: string;
  razaoSocial?: string;
  cnpj?: string;
  valor: number;
  prazoEntrega?: string;
  validade?: string;
  conformidade?: string;
  observacoes?: string;
  orcamentoFisicoNome?: string;
  orcamentoFisicoTipo?: string;
  orcamentoFisicoConteudo?: string;
  cartaoCnpjUrl?: string;
  cartaoCnpjNome?: string;
  cartaoCnpjTipo?: string;
  cartaoCnpjConteudo?: string;
};

export type AutorizacaoCotacao = AutorizacaoCotacaoPayload & {
  id: number;
  autorizacaoCompraId: number;
  criadoEm: string;
};

export type FornecedorCnpj = {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  idConsulta?: string;
};

export type ReservaBancariaPayload = {
  contaBancariaId: number;
  valor: number;
};

export type ReservaBancaria = {
  id: number;
  autorizacaoCompraId: number;
  contaBancariaId: number;
  valor: number;
  criadoEm: string;
};

export type AutorizacaoPagamentoPayload = {
  autor?: string;
  data?: string;
  observacoes?: string;
};
