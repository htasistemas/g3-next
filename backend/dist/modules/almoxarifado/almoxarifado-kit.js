export function calcularEstoqueMontavelKit(componentes) {
    if (!componentes.length) {
        return 0;
    }
    const quantidadesMontaveis = componentes.map((componente) => {
        const quantidadeItem = Number(componente.quantidade_item ?? 0);
        const estoqueComponente = Number(componente.estoque_componente ?? 0);
        if (!Number.isFinite(quantidadeItem) || quantidadeItem <= 0) {
            return 0;
        }
        if (!Number.isFinite(estoqueComponente) || estoqueComponente <= 0) {
            return 0;
        }
        return Math.floor(estoqueComponente / quantidadeItem);
    });
    return Math.max(0, Math.min(...quantidadesMontaveis));
}
export function calcularEstoqueDisponivelKit(estoqueFisico, componentes) {
    const estoqueBase = Number.isFinite(estoqueFisico) ? Number(estoqueFisico) : 0;
    return Math.max(0, estoqueBase) + calcularEstoqueMontavelKit(componentes);
}
export function planejarConsumoSaidaKit(estoqueFisico, quantidadeSolicitada, componentes) {
    const estoqueBase = Number.isFinite(estoqueFisico) ? Math.max(0, Number(estoqueFisico)) : 0;
    const quantidade = Number.isFinite(quantidadeSolicitada) ? Math.max(0, Number(quantidadeSolicitada)) : 0;
    const quantidadeMontavel = calcularEstoqueMontavelKit(componentes);
    const estoqueDisponivel = estoqueBase + quantidadeMontavel;
    if (quantidade > estoqueDisponivel) {
        return {
            suficiente: false,
            estoqueDisponivel,
            consumirEstoqueFisico: 0,
            consumirComponentes: 0
        };
    }
    const consumirEstoqueFisico = Math.min(estoqueBase, quantidade);
    const consumirComponentes = Math.max(0, quantidade - consumirEstoqueFisico);
    return {
        suficiente: true,
        estoqueDisponivel,
        consumirEstoqueFisico,
        consumirComponentes
    };
}
