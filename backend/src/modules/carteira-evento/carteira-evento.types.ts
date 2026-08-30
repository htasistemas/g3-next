export const eventoCarteiraTipoValues = [
  "FESTA_BARRACAS",
  "BAZAR",
  "CANTINA",
  "QUERMESSE",
  "FEIRA_SOLIDARIA",
  "CAMPANHA_BENEFICENTE",
  "OUTROS"
] as const;

export const eventoCarteiraStatusValues = ["PLANEJADO", "ATIVO", "FINALIZADO", "CANCELADO"] as const;
export const eventoCarteiraModoFinanceiroValues = ["SIMPLES", "CONTABIL_AVANCADO"] as const;
export const participanteCarteiraStatusValues = ["ATIVO", "BLOQUEADO", "ENCERRADO"] as const;
export const barracaStatusValues = ["ATIVA", "INATIVA"] as const;
export const itemEventoCategoriaValues = [
  "ALIMENTO",
  "BEBIDA",
  "DOCE",
  "BRINCADEIRA",
  "BAZAR",
  "INGRESSO",
  "FICHA_ESPECIAL",
  "OUTROS"
] as const;
export const formaPagamentoCarteiraValues = [
  "DINHEIRO",
  "PIX",
  "CARTAO",
  "CORTESIA",
  "TRANSFERENCIA_INTERNA"
] as const;
export const tipoMovimentacaoCarteiraValues = [
  "RECARGA",
  "VENDA",
  "TRANSFERENCIA_ENVIADA",
  "TRANSFERENCIA_RECEBIDA",
  "AJUSTE_CREDITO",
  "AJUSTE_DEBITO",
  "ESTORNO",
  "SEGUNDA_VIA"
] as const;
export const tipoRelatorioCarteiraValues = [
  "PARTICIPANTES",
  "BARRACAS",
  "ITENS",
  "EVENTO",
  "EXTRATO_GERAL",
  "CREDITOS_NAO_UTILIZADOS",
  "RANKING_VENDAS",
  "CONSUMO_POR_HORARIO",
  "RESUMO_FINANCEIRO"
] as const;

export type EventoCarteiraTipo = (typeof eventoCarteiraTipoValues)[number];
export type EventoCarteiraStatus = (typeof eventoCarteiraStatusValues)[number];
export type EventoCarteiraModoFinanceiro = (typeof eventoCarteiraModoFinanceiroValues)[number];
export type ParticipanteCarteiraStatus = (typeof participanteCarteiraStatusValues)[number];
export type BarracaStatus = (typeof barracaStatusValues)[number];
export type ItemEventoCategoria = (typeof itemEventoCategoriaValues)[number];
export type FormaPagamentoCarteira = (typeof formaPagamentoCarteiraValues)[number];
export type TipoMovimentacaoCarteira = (typeof tipoMovimentacaoCarteiraValues)[number];
export type TipoRelatorioCarteira = (typeof tipoRelatorioCarteiraValues)[number];

export type EventoCarteiraInput = {
  nome_evento: string;
  tipo_evento: EventoCarteiraTipo;
  data_inicio: string;
  data_fim?: string;
  status: EventoCarteiraStatus;
  permite_recarga: boolean;
  permite_transferencia: boolean;
  permite_estorno: boolean;
  validade_credito?: string;
  centro_receita?: string;
  modo_financeiro: EventoCarteiraModoFinanceiro;
  observacoes?: string;
  permite_saldo_negativo_adm?: boolean;
};

export type ParticipanteCarteiraInput = {
  evento_id: number;
  nome: string;
  telefone?: string;
  cpf?: string;
  foto_url?: string;
  responsavel?: string;
  numero_carteira?: string;
  status: ParticipanteCarteiraStatus;
  observacoes?: string;
};

export type RecargaCarteiraInput = {
  participante_id: number;
  valor_recarga: number;
  forma_pagamento: FormaPagamentoCarteira;
  observacao?: string;
};

export type TransferenciaCarteiraInput = {
  evento_id: number;
  carteira_origem_id: number;
  carteira_destino_id: number;
  valor_transferencia: number;
  motivo: string;
};

export type AjusteCarteiraInput = {
  participante_id: number;
  tipo_ajuste: "CREDITO" | "DEBITO" | "ESTORNO";
  valor: number;
  motivo: string;
};

export type BarracaEventoInput = {
  evento_id: number;
  nome_barraca: string;
  responsavel?: string;
  tipo_barraca?: string;
  operador?: string;
  status: BarracaStatus;
  impressora?: string;
  observacoes?: string;
};

export type ItemEventoInput = {
  evento_id: number;
  barraca_id?: number;
  nome_item: string;
  categoria: ItemEventoCategoria;
  preco: number;
  estoque?: number;
  ativo: boolean;
  foto_url?: string;
  ordem_exibicao?: number;
};

export type OperacaoConsultaTokenInput = {
  evento_id: number;
  token: string;
};

export type OperacaoVendaItemInput = {
  item_id: number;
  quantidade: number;
};

export type OperacaoVendaInput = {
  evento_id: number;
  barraca_id: number;
  token: string;
  itens: OperacaoVendaItemInput[];
  chave_operacao: string;
  observacao?: string;
};

export type EstornoVendaInput = {
  venda_id: number;
  motivo: string;
};

export type ParticipanteCarteiraFilters = {
  evento_id?: number;
  busca?: string;
  status?: string;
  limite?: number;
};

export type EventoCarteiraFilters = {
  status?: string;
  busca?: string;
  limite?: number;
};

export type BarracaEventoFilters = {
  evento_id?: number;
  status?: string;
};

export type ItemEventoFilters = {
  evento_id?: number;
  barraca_id?: number;
  ativo?: boolean;
  busca?: string;
};

export type ExtratoCarteiraFilters = {
  participante_id: number;
  limite?: number;
};

export type DashboardCarteiraFilters = {
  evento_id: number;
};

export type FechamentoCarteiraFilters = {
  evento_id: number;
};

export type RelatorioCarteiraFilters = {
  evento_id: number;
  tipo: TipoRelatorioCarteira;
};

export type AuditoriaCarteiraFilters = {
  evento_id: number;
  limite?: number;
};

export type CarteiraEventoAtor = {
  id?: bigint;
  nome_usuario: string;
  nome?: string;
  tenantId?: string;
};
