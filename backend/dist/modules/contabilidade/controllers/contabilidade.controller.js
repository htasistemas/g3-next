import { ContabilidadeService } from "../services/contabilidade.service.js";
const service = new ContabilidadeService();
function obterIp(request) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) {
        return forwarded.split(",")[0]?.trim() ?? null;
    }
    return request.socket.remoteAddress ?? null;
}
function obterOrigem(request) {
    const userAgent = request.headers["user-agent"];
    return typeof userAgent === "string" && userAgent.trim() ? userAgent.trim() : null;
}
function obterAtor(request) {
    return {
        usuarioId: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
        nomeUsuario: request.authUser?.nomeUsuario,
        permissoes: request.authUser?.permissoes ?? [],
        ip: obterIp(request),
        maquina: obterOrigem(request)
    };
}
export class ContabilidadeController {
    async listarContasBancarias(_request, response) {
        const lista = await service.listarContasBancarias();
        return response.json(lista);
    }
    async criarContaBancaria(request, response) {
        const registro = await service.criarContaBancaria(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarContaBancaria(request, response) {
        const registro = await service.atualizarContaBancaria(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async removerContaBancaria(request, response) {
        await service.removerContaBancaria(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async listarCategorias(_request, response) {
        const lista = await service.listarCategorias();
        return response.json(lista);
    }
    async criarCategoria(request, response) {
        const registro = await service.criarCategoria(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarCategoria(request, response) {
        const registro = await service.atualizarCategoria(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async removerCategoria(request, response) {
        await service.removerCategoria(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async listarCentrosCusto(_request, response) {
        const lista = await service.listarCentrosCusto();
        return response.json(lista);
    }
    async criarCentroCusto(request, response) {
        const registro = await service.criarCentroCusto(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarCentroCusto(request, response) {
        const registro = await service.atualizarCentroCusto(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async removerCentroCusto(request, response) {
        await service.removerCentroCusto(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async listarLancamentos(_request, response) {
        const lista = await service.listarLancamentos();
        return response.json(lista);
    }
    async criarLancamento(request, response) {
        const registro = await service.criarLancamento(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarLancamento(request, response) {
        const registro = await service.atualizarLancamento(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async atualizarSituacaoLancamento(request, response) {
        const registro = await service.atualizarSituacaoLancamento(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async pagarLancamento(request, response) {
        const recibo = await service.pagarLancamento(request.params.id, request.body, obterAtor(request));
        return response.json(recibo);
    }
    async estornarLancamento(request, response) {
        const registro = await service.estornarLancamento(request.params.id, obterAtor(request));
        return response.json(registro);
    }
    async removerLancamento(request, response) {
        await service.removerLancamento(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async listarMovimentacoes(_request, response) {
        const lista = await service.listarMovimentacoes();
        return response.json(lista);
    }
    async criarMovimentacao(request, response) {
        const registro = await service.criarMovimentacao(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarMovimentacao(request, response) {
        const registro = await service.atualizarMovimentacao(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async removerMovimentacao(request, response) {
        await service.removerMovimentacao(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async listarTransferencias(_request, response) {
        const lista = await service.listarTransferencias();
        return response.json(lista);
    }
    async criarTransferencia(request, response) {
        const registro = await service.criarTransferencia(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async estornarTransferencia(request, response) {
        const registro = await service.estornarTransferencia(request.params.id, obterAtor(request));
        return response.json(registro);
    }
    async listarConciliacoes(_request, response) {
        const lista = await service.listarConciliacoes();
        return response.json(lista);
    }
    async criarConciliacao(request, response) {
        const registro = await service.criarConciliacao(request.body, obterAtor(request));
        return response.status(201).json(registro);
    }
    async atualizarSituacaoConciliacao(request, response) {
        const registro = await service.atualizarSituacaoConciliacao(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async listarHistorico(_request, response) {
        const lista = await service.listarHistorico();
        return response.json(lista);
    }
    async listarComprasIntegradas(_request, response) {
        const lista = await service.listarComprasIntegradas();
        return response.json(lista);
    }
    async gerarObrigacaoFinanceiraPorCompra(request, response) {
        const registro = await service.gerarObrigacaoFinanceiraPorCompra(request.params.id, obterAtor(request));
        return response.status(201).json(registro);
    }
    async listarEmendas(_request, response) {
        const lista = await service.listarEmendas();
        return response.json(lista);
    }
    async criarEmenda(request, response) {
        const registro = await service.criarEmenda(request.body);
        return response.status(201).json(registro);
    }
    async atualizarStatusEmenda(request, response) {
        const registro = await service.atualizarStatusEmenda(request.params.id, request.body);
        return response.json(registro);
    }
}
