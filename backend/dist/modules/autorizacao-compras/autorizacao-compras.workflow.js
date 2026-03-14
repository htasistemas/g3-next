export const AUTORIZACAO_COMPRA_STATUS_LABELS = {
    SOLICITADO: "Solicitado",
    EM_ANALISE: "Em análise",
    AGUARDANDO_APROVACAO: "Aguardando aprovação",
    APROVADO: "Aprovado",
    REPROVADO: "Reprovado",
    DEVOLVIDO_PARA_AJUSTE: "Devolvido para ajuste",
    EM_COTACAO: "Em cotação",
    COTACAO_CONCLUIDA: "Cotação concluída",
    FORNECEDOR_DEFINIDO: "Fornecedor definido",
    FORA_DO_ORCAMENTO: "Fora do orçamento",
    RESERVA_EFETUADA: "Reserva efetuada",
    RESERVA_CANCELADA: "Reserva cancelada",
    PAGAMENTO_AUTORIZADO: "Pagamento autorizado",
    DESPESA_LANCADA: "Despesa lançada",
    INTEGRADO_AO_ALMOXARIFADO: "Integrado ao almoxarifado",
    INTEGRADO_AO_PATRIMONIO: "Integrado ao patrimônio",
    FINALIZADO: "Finalizado",
    CANCELADO: "Cancelado"
};
export const AUTORIZACAO_COMPRA_STATUS_ATIVOS = new Set([
    "SOLICITADO",
    "EM_ANALISE",
    "AGUARDANDO_APROVACAO",
    "APROVADO",
    "EM_COTACAO",
    "COTACAO_CONCLUIDA",
    "FORNECEDOR_DEFINIDO",
    "FORA_DO_ORCAMENTO",
    "RESERVA_EFETUADA",
    "PAGAMENTO_AUTORIZADO",
    "DESPESA_LANCADA",
    "INTEGRADO_AO_ALMOXARIFADO",
    "INTEGRADO_AO_PATRIMONIO",
    "FINALIZADO"
]);
export const DEFAULT_APPROVAL_LEVELS = [
    {
        codigo: "COORDENACAO",
        nome: "Coordenação",
        ordem: 1,
        valorMinimo: 0,
        valorMaximo: 5000,
        permissaoRequerida: "OPERADOR"
    },
    {
        codigo: "GERENCIA",
        nome: "Gerência",
        ordem: 2,
        valorMinimo: 5000.01,
        valorMaximo: 20000,
        permissaoRequerida: "ADMINISTRADOR"
    },
    {
        codigo: "DIRETORIA",
        nome: "Diretoria / presidência",
        ordem: 3,
        valorMinimo: 20000.01,
        valorMaximo: null,
        permissaoRequerida: "ADMINISTRADOR"
    }
];
export const AUTORIZACAO_COMPRA_TIPOS_COMPRA = [
    "Material de consumo",
    "Bens patrimoniais",
    "Serviços"
];
const TIPO_COMPRA_PARA_ITEM = {
    "Material de consumo": "material",
    "Bens patrimoniais": "bem",
    "Serviços": "servico"
};
export function calcularValorTotalItens(itens) {
    return itens.reduce((total, item) => {
        const quantidade = Number(item.quantidade) || 0;
        const valor = Number(item.valorEstimado) || 0;
        return total + quantidade * valor;
    }, 0);
}
export function determinarValorSolicitacao(itens, valorInformado) {
    const valorItens = calcularValorTotalItens(itens);
    return valorItens > 0 ? valorItens : Number(valorInformado ?? 0);
}
export function resumirOrcamento(orcamentoPrevisto, orcamentoUtilizado, valorSolicitacao) {
    const previsto = Number.isFinite(orcamentoPrevisto) ? Number(orcamentoPrevisto) : 0;
    const utilizado = Number.isFinite(orcamentoUtilizado) ? Number(orcamentoUtilizado) : 0;
    const valor = Number.isFinite(valorSolicitacao) ? Number(valorSolicitacao) : 0;
    const saldoDisponivel = previsto - utilizado;
    return {
        previsto,
        utilizado,
        saldoDisponivel,
        valorSolicitacao: valor,
        extrapola: valor > saldoDisponivel
    };
}
export function determinarNiveisObrigatorios(valorSolicitacao, niveis) {
    const ordenados = [...niveis]
        .filter((nivel) => nivel.ativo)
        .sort((a, b) => a.ordem - b.ordem);
    if (!ordenados.length)
        return [];
    const nivelAlvo = ordenados.find((nivel) => {
        const acimaDoMinimo = valorSolicitacao >= Number(nivel.valor_minimo ?? 0);
        const abaixoDoMaximo = nivel.valor_maximo == null || valorSolicitacao <= Number(nivel.valor_maximo);
        return acimaDoMinimo && abaixoDoMaximo;
    }) ?? ordenados[ordenados.length - 1];
    return ordenados.filter((nivel) => nivel.ordem <= nivelAlvo.ordem);
}
export function calcularResumoCotacoes(cotacoes, cotacaoVencedoraId) {
    const ativas = cotacoes.filter((cotacao) => cotacao.ativo);
    const menor = [...ativas].sort((a, b) => a.valor - b.valor)[0];
    const vencedora = cotacaoVencedoraId
        ? ativas.find((cotacao) => cotacao.id === cotacaoVencedoraId)
        : undefined;
    const divergencia = menor && vencedora ? vencedora.valor - menor.valor : 0;
    return {
        quantidade: ativas.length,
        menor,
        vencedora,
        possuiMinimoObrigatorio: ativas.length >= 3,
        divergenciaValor: divergencia
    };
}
export function gerarNumeroSolicitacao(id, dataReferencia = new Date()) {
    const identificador = typeof id === "bigint" ? Number(id) : id;
    const ano = dataReferencia.getFullYear();
    return `SC-${ano}-${String(identificador).padStart(6, "0")}`;
}
export function gerarNumeroReserva(id, dataReferencia = new Date()) {
    const identificador = typeof id === "bigint" ? Number(id) : id;
    const ano = dataReferencia.getFullYear();
    return `RES-${ano}-${String(identificador).padStart(6, "0")}`;
}
export function gerarNumeroAutorizacaoPagamento(id, dataReferencia = new Date()) {
    const identificador = typeof id === "bigint" ? Number(id) : id;
    const ano = dataReferencia.getFullYear();
    return `AP-${ano}-${String(identificador).padStart(6, "0")}`;
}
export function validarPermissaoNivel(permissoesUsuario, permissaoRequerida) {
    return (permissoesUsuario.includes("ADMINISTRADOR") ||
        permissoesUsuario.includes(permissaoRequerida));
}
export function normalizarStatusAutorizacao(valor) {
    const normalizado = String(valor ?? "SOLICITADO")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
    if (normalizado in AUTORIZACAO_COMPRA_STATUS_LABELS) {
        return normalizado;
    }
    return "SOLICITADO";
}
export function normalizarTipoCompra(valor) {
    const normalizado = String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    if (normalizado === "material" || normalizado === "material de consumo") {
        return "Material de consumo";
    }
    if (normalizado === "bem patrimonial" ||
        normalizado === "bens patrimoniais" ||
        normalizado === "bem") {
        return "Bens patrimoniais";
    }
    if (normalizado === "servico" ||
        normalizado === "servicos" ||
        normalizado === "serviço" ||
        normalizado === "serviços") {
        return "Serviços";
    }
    return "Material de consumo";
}
export function tipoCompraParaTipoItem(tipoCompra) {
    return TIPO_COMPRA_PARA_ITEM[tipoCompra];
}
