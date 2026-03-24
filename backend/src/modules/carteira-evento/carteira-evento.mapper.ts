export type EventoCarteiraRow = {
  id: bigint;
  nome_evento: string;
  tipo_evento: string;
  data_inicio: Date;
  data_fim: Date | null;
  status: string;
  permite_recarga: boolean;
  permite_transferencia: boolean;
  permite_estorno: boolean;
  validade_credito: Date | null;
  centro_receita: string | null;
  modo_financeiro: string;
  observacoes: string | null;
  permite_saldo_negativo_adm: boolean | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type ParticipanteCarteiraRow = {
  id: bigint;
  evento_id: bigint;
  nome_evento: string | null;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  foto_url: string | null;
  responsavel: string | null;
  numero_carteira: string;
  status: string;
  qr_code_token_unico: string;
  saldo_atual: number;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type BarracaEventoRow = {
  id: bigint;
  evento_id: bigint;
  nome_evento: string | null;
  nome_barraca: string;
  responsavel: string | null;
  tipo_barraca: string | null;
  operador: string | null;
  status: string;
  impressora: string | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type ItemEventoRow = {
  id: bigint;
  evento_id: bigint;
  barraca_id: bigint | null;
  nome_evento: string | null;
  nome_barraca: string | null;
  nome_item: string;
  categoria: string;
  preco: number;
  estoque: number | null;
  ativo: boolean;
  foto_url: string | null;
  ordem_exibicao: number | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type MovimentacaoCarteiraRow = {
  id: bigint;
  evento_id: bigint;
  participante_id: bigint;
  barraca_id: bigint | null;
  item_id: bigint | null;
  venda_id: bigint | null;
  tipo_movimentacao: string;
  forma_pagamento: string | null;
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string | null;
  motivo: string | null;
  referencia_externa: string | null;
  criado_em: Date;
  operador_nome: string | null;
  participante_nome: string | null;
  barraca_nome: string | null;
  item_nome: string | null;
};

export type VendaCarteiraRow = {
  id: bigint;
  evento_id: bigint;
  barraca_id: bigint;
  participante_id: bigint;
  chave_operacao: string;
  valor_total: number;
  saldo_antes: number;
  saldo_depois: number;
  observacao: string | null;
  criado_em: Date;
  operador_nome: string | null;
  participante_nome: string | null;
  barraca_nome: string | null;
};

export type VendaCarteiraItemRow = {
  id: bigint;
  venda_id: bigint;
  item_id: bigint;
  nome_item: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

function toIso(value?: Date | null) {
  return value?.toISOString();
}

export function mapEventoCarteira(row: EventoCarteiraRow) {
  return {
    id: Number(row.id),
    nomeEvento: row.nome_evento,
    tipoEvento: row.tipo_evento,
    dataInicio: toIso(row.data_inicio),
    dataFim: toIso(row.data_fim),
    status: row.status,
    permiteRecarga: !!row.permite_recarga,
    permiteTransferencia: !!row.permite_transferencia,
    permiteEstorno: !!row.permite_estorno,
    validadeCredito: toIso(row.validade_credito),
    centroReceita: row.centro_receita ?? "",
    modoFinanceiro: row.modo_financeiro,
    observacoes: row.observacoes ?? "",
    permiteSaldoNegativoAdm: !!row.permite_saldo_negativo_adm,
    criadoEm: toIso(row.criado_em),
    atualizadoEm: toIso(row.atualizado_em)
  };
}

export function mapParticipanteCarteira(row: ParticipanteCarteiraRow) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    nomeEvento: row.nome_evento ?? "",
    nome: row.nome,
    telefone: row.telefone ?? "",
    cpf: row.cpf ?? "",
    fotoUrl: row.foto_url ?? "",
    responsavel: row.responsavel ?? "",
    numeroCarteira: row.numero_carteira,
    status: row.status,
    qrCodeTokenUnico: row.qr_code_token_unico,
    saldoAtual: Number(row.saldo_atual ?? 0),
    observacoes: row.observacoes ?? "",
    criadoEm: toIso(row.criado_em),
    atualizadoEm: toIso(row.atualizado_em)
  };
}

export function mapBarracaEvento(row: BarracaEventoRow) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    nomeEvento: row.nome_evento ?? "",
    nomeBarraca: row.nome_barraca,
    responsavel: row.responsavel ?? "",
    tipoBarraca: row.tipo_barraca ?? "",
    operador: row.operador ?? "",
    status: row.status,
    impressora: row.impressora ?? "",
    observacoes: row.observacoes ?? "",
    criadoEm: toIso(row.criado_em),
    atualizadoEm: toIso(row.atualizado_em)
  };
}

export function mapItemEvento(row: ItemEventoRow) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    barracaId: row.barraca_id ? Number(row.barraca_id) : undefined,
    nomeEvento: row.nome_evento ?? "",
    nomeBarraca: row.nome_barraca ?? "",
    nomeItem: row.nome_item,
    categoria: row.categoria,
    preco: Number(row.preco ?? 0),
    estoque: row.estoque == null ? undefined : Number(row.estoque),
    ativo: !!row.ativo,
    fotoUrl: row.foto_url ?? "",
    ordemExibicao: row.ordem_exibicao == null ? 0 : Number(row.ordem_exibicao),
    criadoEm: toIso(row.criado_em),
    atualizadoEm: toIso(row.atualizado_em)
  };
}

export function mapMovimentacaoCarteira(row: MovimentacaoCarteiraRow) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    participanteId: Number(row.participante_id),
    barracaId: row.barraca_id ? Number(row.barraca_id) : undefined,
    itemId: row.item_id ? Number(row.item_id) : undefined,
    vendaId: row.venda_id ? Number(row.venda_id) : undefined,
    tipoMovimentacao: row.tipo_movimentacao,
    formaPagamento: row.forma_pagamento ?? "",
    valor: Number(row.valor ?? 0),
    saldoAnterior: Number(row.saldo_anterior ?? 0),
    saldoPosterior: Number(row.saldo_posterior ?? 0),
    descricao: row.descricao ?? "",
    motivo: row.motivo ?? "",
    referenciaExterna: row.referencia_externa ?? "",
    criadoEm: toIso(row.criado_em),
    operadorNome: row.operador_nome ?? "",
    participanteNome: row.participante_nome ?? "",
    barracaNome: row.barraca_nome ?? "",
    itemNome: row.item_nome ?? ""
  };
}

export function mapVendaCarteira(row: VendaCarteiraRow, itens: VendaCarteiraItemRow[]) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    barracaId: Number(row.barraca_id),
    participanteId: Number(row.participante_id),
    chaveOperacao: row.chave_operacao,
    valorTotal: Number(row.valor_total ?? 0),
    saldoAntes: Number(row.saldo_antes ?? 0),
    saldoDepois: Number(row.saldo_depois ?? 0),
    observacao: row.observacao ?? "",
    criadoEm: toIso(row.criado_em),
    operadorNome: row.operador_nome ?? "",
    participanteNome: row.participante_nome ?? "",
    barracaNome: row.barraca_nome ?? "",
    itens: itens.map((item) => ({
      id: Number(item.id),
      itemId: Number(item.item_id),
      nomeItem: item.nome_item,
      quantidade: Number(item.quantidade ?? 0),
      valorUnitario: Number(item.valor_unitario ?? 0),
      valorTotal: Number(item.valor_total ?? 0)
    }))
  };
}
