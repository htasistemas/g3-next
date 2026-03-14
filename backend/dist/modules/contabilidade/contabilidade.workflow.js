export const CONTA_BANCARIA_TIPOS = [
    "CONTA_CORRENTE",
    "POUPANCA",
    "APLICACAO",
    "CAIXA_INTERNO"
];
export const CONTA_BANCARIA_STATUS = [
    "ATIVA",
    "INATIVA"
];
export const CATEGORIA_FINANCEIRA_TIPOS = [
    "RECEITA",
    "DESPESA"
];
export const LANCAMENTO_FINANCEIRO_TIPOS = [
    "RECEITA",
    "DESPESA",
    "TRANSFERENCIA",
    "AJUSTE",
    "ESTORNO"
];
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
];
export const TRANSFERENCIA_FINANCEIRA_STATUS = [
    "PENDENTE",
    "CONCLUIDA",
    "ESTORNADA",
    "CANCELADA"
];
export const CONCILIACAO_FINANCEIRA_SITUACOES = [
    "PENDENTE",
    "CONCILIADO",
    "DIVERGENTE"
];
export function normalizarTextoEnum(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}
export function normalizarTipoConta(valor) {
    const normalizado = normalizarTextoEnum(valor);
    if (normalizado === "POUPANCA")
        return "POUPANCA";
    if (normalizado === "APLICACAO")
        return "APLICACAO";
    if (normalizado === "CAIXA_INTERNO" || normalizado === "CAIXA")
        return "CAIXA_INTERNO";
    return "CONTA_CORRENTE";
}
export function normalizarStatusConta(valor) {
    return normalizarTextoEnum(valor) === "INATIVA" ? "INATIVA" : "ATIVA";
}
export function normalizarTipoCategoria(valor) {
    return normalizarTextoEnum(valor) === "RECEITA" ? "RECEITA" : "DESPESA";
}
export function normalizarTipoLancamento(valor) {
    const normalizado = normalizarTextoEnum(valor);
    if (normalizado === "RECEITA")
        return "RECEITA";
    if (normalizado === "TRANSFERENCIA")
        return "TRANSFERENCIA";
    if (normalizado === "AJUSTE")
        return "AJUSTE";
    if (normalizado === "ESTORNO")
        return "ESTORNO";
    return "DESPESA";
}
export function normalizarStatusLancamento(valor, tipo) {
    const normalizado = normalizarTextoEnum(valor);
    if (LANCAMENTO_FINANCEIRO_STATUS.includes(normalizado)) {
        return normalizado;
    }
    return tipo === "RECEITA" ? "AGUARDANDO_RECEBIMENTO" : "AGUARDANDO_PAGAMENTO";
}
export function normalizarStatusTransferencia(valor) {
    const normalizado = normalizarTextoEnum(valor);
    if (TRANSFERENCIA_FINANCEIRA_STATUS.includes(normalizado)) {
        return normalizado;
    }
    return "CONCLUIDA";
}
export function normalizarSituacaoConciliacao(valor) {
    const normalizado = normalizarTextoEnum(valor);
    if (CONCILIACAO_FINANCEIRA_SITUACOES.includes(normalizado)) {
        return normalizado;
    }
    return "PENDENTE";
}
export function statusBaixadoPorTipo(tipo) {
    return tipo === "RECEITA" ? "RECEBIDO" : "PAGO";
}
export function statusPendentePorTipo(tipo) {
    return tipo === "RECEITA" ? "AGUARDANDO_RECEBIMENTO" : "AGUARDANDO_PAGAMENTO";
}
export function tipoMovimentacaoPorLancamento(tipo) {
    return tipo === "RECEITA" ? "ENTRADA" : "SAIDA";
}
export function calcularSaldoConta(saldoAtual, valor, tipoMovimentacao) {
    return tipoMovimentacao === "ENTRADA" ? saldoAtual + valor : saldoAtual - valor;
}
export function gerarNumeroRecibo(id, prefixo = "FIN") {
    const identificador = typeof id === "bigint" ? Number(id) : id;
    return `${prefixo}-${String(identificador).padStart(6, "0")}`;
}
export function isStatusEmAberto(status) {
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
export function lancamentoEstaBloqueadoPorOrigem(origem) {
    return normalizarTextoEnum(origem) === "COMPRA";
}
