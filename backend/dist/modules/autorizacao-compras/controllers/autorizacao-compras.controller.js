import { AutorizacaoComprasService } from "../services/autorizacao-compras.service.js";
const service = new AutorizacaoComprasService();
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
        tenantId: request.authUser?.tenant_id,
        ip: obterIp(request),
        maquina: obterOrigem(request)
    };
}
export class AutorizacaoComprasController {
    async listar(request, response) {
        const lista = await service.listar(request.authUser?.tenant_id);
        return response.json(lista);
    }
    async listarIndicadores(request, response) {
        const indicadores = await service.listarIndicadores(request.authUser?.tenant_id);
        return response.json(indicadores);
    }
    async listarSetoresSolicitantes(request, response) {
        const setores = await service.listarSetoresSolicitantes(request.authUser?.tenant_id);
        return response.json(setores);
    }
    async buscarDetalhe(request, response) {
        const registro = await service.buscarDetalhe(request.params.id, request.authUser?.tenant_id);
        return response.json(registro);
    }
    async criar(request, response) {
        const item = await service.criar(request.body, obterAtor(request));
        return response.status(201).json(item);
    }
    async atualizar(request, response) {
        const item = await service.atualizar(request.params.id, request.body, obterAtor(request));
        return response.json(item);
    }
    async excluir(request, response) {
        await service.remover(request.params.id, obterAtor(request));
        return response.status(204).send();
    }
    async enviarParaAprovacao(request, response) {
        const item = await service.enviarParaAprovacao(request.params.id, obterAtor(request));
        return response.json(item);
    }
    async registrarAprovacao(request, response) {
        const item = await service.registrarAprovacao(request.params.id, request.body, obterAtor(request));
        return response.json(item);
    }
    async listarCotacoes(request, response) {
        const lista = await service.listarCotacoes(request.params.id, request.authUser?.tenant_id);
        return response.json(lista);
    }
    async criarCotacao(request, response) {
        const lista = await service.criarCotacao(request.params.id, request.body, obterAtor(request));
        return response.status(201).json(lista);
    }
    async excluirCotacao(request, response) {
        await service.removerCotacao(request.params.id, request.params.quoteId, obterAtor(request));
        return response.status(204).send();
    }
    async definirFornecedor(request, response) {
        const registro = await service.definirFornecedor(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
    async buscarFornecedorPorCnpj(request, response) {
        const fornecedor = await service.buscarFornecedorPorCnpj(request.params.cnpj, request.authUser?.tenant_id);
        return response.json(fornecedor);
    }
    async consultarDocumentoFornecedor(request, response) {
        const fornecedor = await service.consultarDocumentoFornecedor(request.params.tipo, request.params.documento, request.authUser?.tenant_id);
        return response.json(fornecedor);
    }
    async registrarReservaBancaria(request, response) {
        const reservas = await service.registrarReservaBancaria(request.params.id, request.body, obterAtor(request));
        return response.status(201).json(reservas);
    }
    async listarReservas(request, response) {
        const reservas = await service.listarReservas(request.params.id, request.authUser?.tenant_id);
        return response.json(reservas);
    }
    async removerReservaBancaria(request, response) {
        await service.removerReservaBancaria(request.params.id, request.params.reservaId, obterAtor(request));
        return response.status(204).send();
    }
    async gerarAutorizacaoPagamento(request, response) {
        const registro = await service.gerarAutorizacaoPagamento(request.params.id, request.body, obterAtor(request));
        return response.json(registro);
    }
}
