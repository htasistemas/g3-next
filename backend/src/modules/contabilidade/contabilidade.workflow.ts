import type {
  CategoriaFinanceiraTipo,
  ContaBancariaStatus,
  ContaBancariaTipo,
  ConciliacaoFinanceiraSituacao,
  LancamentoFinanceiroStatus,
  LancamentoFinanceiroTipo,
  TransferenciaFinanceiraStatus
} from "./contabilidade.types.js";

export const CONTA_BANCARIA_TIPOS = [
  "CONTA_CORRENTE",
  "POUPANCA",
  "APLICACAO",
  "CAIXA_INTERNO"
] as const satisfies readonly ContaBancariaTipo[];

export const CONTA_BANCARIA_STATUS = [
  "ATIVA",
  "INATIVA"
] as const satisfies readonly ContaBancariaStatus[];

export const CATEGORIA_FINANCEIRA_TIPOS = [
  "RECEITA",
  "DESPESA"
] as const satisfies readonly CategoriaFinanceiraTipo[];

export const LANCAMENTO_FINANCEIRO_TIPOS = [
  "RECEITA",
  "DESPESA",
  "TRANSFERENCIA",
  "AJUSTE",
  "ESTORNO"
] as const satisfies readonly LancamentoFinanceiroTipo[];

export const LANCAMENTO_FINANCEIRO_STATUS = [
  "PREVISTO",
  "PENDENTE",
  "PAGO",
  "RECEBIDO",
  "VENCIDO",
  "ATRASADO",
  "CANCELADO",
  "CONCILIADO",
  "ESTORNADO",
  "AGUARDANDO_PAGAMENTO",
  "AGUARDANDO_RECEBIMENTO",
  "RENEGOCIADO"
] as const satisfies readonly LancamentoFinanceiroStatus[];

export const TRANSFERENCIA_FINANCEIRA_STATUS = [
  "PENDENTE",
  "CONCLUIDA",
  "ESTORNADA",
  "CANCELADA"
] as const satisfies readonly TransferenciaFinanceiraStatus[];

export const CONCILIACAO_FINANCEIRA_SITUACOES = [
  "PENDENTE",
  "CONCILIADO",
  "DIVERGENTE"
] as const satisfies readonly ConciliacaoFinanceiraSituacao[];

export function normalizarTextoEnum(valor?: string | null) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function normalizarTipoConta(valor?: string | null): ContaBancariaTipo {
  const normalizado = normalizarTextoEnum(valor);
  if (normalizado === "POUPANCA") return "POUPANCA";
  if (normalizado === "APLICACAO") return "APLICACAO";
  if (normalizado === "CAIXA_INTERNO" || normalizado === "CAIXA") return "CAIXA_INTERNO";
  return "CONTA_CORRENTE";
}

export function normalizarStatusConta(valor?: string | null): ContaBancariaStatus {
  return normalizarTextoEnum(valor) === "INATIVA" ? "INATIVA" : "ATIVA";
}

export function normalizarTipoCategoria(valor?: string | null): CategoriaFinanceiraTipo {
  return normalizarTextoEnum(valor) === "RECEITA" ? "RECEITA" : "DESPESA";
}

export function normalizarTipoLancamento(valor?: string | null): LancamentoFinanceiroTipo {
  const normalizado = normalizarTextoEnum(valor);
  if (normalizado === "RECEITA") return "RECEITA";
  if (normalizado === "TRANSFERENCIA") return "TRANSFERENCIA";
  if (normalizado === "AJUSTE") return "AJUSTE";
  if (normalizado === "ESTORNO") return "ESTORNO";
  return "DESPESA";
}

export function normalizarStatusLancamento(
  valor?: string | null,
  tipo?: LancamentoFinanceiroTipo
): LancamentoFinanceiroStatus {
  const normalizado = normalizarTextoEnum(valor);
  if ((LANCAMENTO_FINANCEIRO_STATUS as readonly string[]).includes(normalizado)) {
    return normalizado as LancamentoFinanceiroStatus;
  }

  return tipo === "RECEITA" ? "AGUARDANDO_RECEBIMENTO" : "AGUARDANDO_PAGAMENTO";
}

export function normalizarStatusTransferencia(valor?: string | null): TransferenciaFinanceiraStatus {
  const normalizado = normalizarTextoEnum(valor);
  if ((TRANSFERENCIA_FINANCEIRA_STATUS as readonly string[]).includes(normalizado)) {
    return normalizado as TransferenciaFinanceiraStatus;
  }
  return "CONCLUIDA";
}

export function normalizarSituacaoConciliacao(valor?: string | null): ConciliacaoFinanceiraSituacao {
  const normalizado = normalizarTextoEnum(valor);
  if ((CONCILIACAO_FINANCEIRA_SITUACOES as readonly string[]).includes(normalizado)) {
    return normalizado as ConciliacaoFinanceiraSituacao;
  }
  return "PENDENTE";
}

export function statusBaixadoPorTipo(tipo: LancamentoFinanceiroTipo): LancamentoFinanceiroStatus {
  return tipo === "RECEITA" ? "RECEBIDO" : "PAGO";
}

export function statusPendentePorTipo(tipo: LancamentoFinanceiroTipo): LancamentoFinanceiroStatus {
  return tipo === "RECEITA" ? "AGUARDANDO_RECEBIMENTO" : "AGUARDANDO_PAGAMENTO";
}

export function tipoMovimentacaoPorLancamento(tipo: LancamentoFinanceiroTipo) {
  return tipo === "RECEITA" ? "ENTRADA" : "SAIDA";
}

export function calcularSaldoConta(
  saldoAtual: number,
  valor: number,
  tipoMovimentacao: "ENTRADA" | "SAIDA"
) {
  return tipoMovimentacao === "ENTRADA" ? saldoAtual + valor : saldoAtual - valor;
}

export function gerarNumeroRecibo(id: bigint | number, prefixo = "FIN") {
  const identificador = typeof id === "bigint" ? Number(id) : id;
  return `${prefixo}-${String(identificador).padStart(6, "0")}`;
}

export function isStatusEmAberto(status: LancamentoFinanceiroStatus) {
  return [
    "PREVISTO",
    "PENDENTE",
    "VENCIDO",
    "ATRASADO",
    "AGUARDANDO_PAGAMENTO",
    "AGUARDANDO_RECEBIMENTO",
    "RENEGOCIADO"
  ].includes(status);
}

export function lancamentoEstaBloqueadoPorOrigem(origem?: string | null) {
  return normalizarTextoEnum(origem) === "COMPRA";
}
