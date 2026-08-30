export type EventoCarteira = {
  id: number;
  nomeEvento: string;
  tipoEvento: string;
  dataInicio?: string;
  dataFim?: string;
  status: string;
  permiteRecarga: boolean;
  permiteTransferencia: boolean;
  permiteEstorno: boolean;
  validadeCredito?: string;
  centroReceita: string;
  modoFinanceiro: string;
  observacoes: string;
  permiteSaldoNegativoAdm: boolean;
};

export type ParticipanteCarteira = {
  id: number;
  eventoId: number;
  nomeEvento: string;
  nome: string;
  telefone: string;
  cpf: string;
  fotoUrl: string;
  responsavel: string;
  numeroCarteira: string;
  status: string;
  qrCodeTokenUnico: string;
  saldoAtual: number;
  observacoes: string;
};

export type BarracaEvento = {
  id: number;
  eventoId: number;
  nomeEvento: string;
  nomeBarraca: string;
  responsavel: string;
  tipoBarraca: string;
  operador: string;
  status: string;
  impressora: string;
  observacoes: string;
};

export type ItemEventoCarteira = {
  id: number;
  eventoId: number;
  barracaId?: number;
  nomeEvento: string;
  nomeBarraca: string;
  nomeItem: string;
  categoria: string;
  preco: number;
  estoque?: number;
  ativo: boolean;
  fotoUrl: string;
  ordemExibicao: number;
};

export type MovimentacaoCarteira = {
  id: number;
  eventoId: number;
  participanteId: number;
  barracaId?: number;
  itemId?: number;
  vendaId?: number;
  tipoMovimentacao: string;
  formaPagamento: string;
  valor: number;
  saldoAnterior: number;
  saldoPosterior: number;
  descricao: string;
  motivo: string;
  referenciaExterna: string;
  criadoEm?: string;
  operadorNome: string;
  participanteNome: string;
  barracaNome: string;
  itemNome: string;
};

export type VendaCarteira = {
  id: number;
  eventoId: number;
  barracaId: number;
  participanteId: number;
  chaveOperacao: string;
  valorTotal: number;
  saldoAntes: number;
  saldoDepois: number;
  observacao: string;
  criadoEm?: string;
  operadorNome: string;
  participanteNome: string;
  barracaNome: string;
  itens: Array<{
    id: number;
    itemId: number;
    nomeItem: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
};

export type DashboardCarteiraEvento = {
  evento: EventoCarteira;
  totalCarregado: number;
  totalConsumido: number;
  saldoRemanescente: number;
  totalTransferencias: number;
  totalEstornos: number;
  quantidadeParticipantes: number;
  quantidadeCarteiras: number;
  carteirasAtivas: number;
  carteirasBloqueadas: number;
  carteirasSemSaldo: number;
  carteirasAguardandoImpressao: number;
  quantidadeVendas: number;
  ticketMedio: number;
  totalPorBarraca: Array<{ barraca: string; total: number; quantidadeVendas: number }>;
  rankingBarracas: Array<{ posicao: number; barraca: string; total: number; quantidadeVendas: number }>;
  itemMaisVendido: { nomeItem: string; quantidade: number; total: number } | null;
  totalPorFormaPagamento: Array<{ formaPagamento: string; total: number }>;
};
