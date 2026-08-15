import { TermosParceriaService } from "../services/termos-parceria.service.js";
const service = new TermosParceriaService();
export class TermosParceriaController {
    async dashboard(request, response) { return response.json({ dashboard: await service.dashboard(request.authUser) }); }
    async listar(request, response) { const resultado = await service.listar(request.authUser, { status: typeof request.query.status === "string" ? request.query.status : undefined, projetoId: typeof request.query.projetoId === "string" ? request.query.projetoId : undefined, busca: typeof request.query.busca === "string" ? request.query.busca : undefined, pagina: Number(request.query.pagina) || 1, limite: Number(request.query.limite) || 20, ordem: typeof request.query.ordem === "string" ? request.query.ordem : undefined, direcao: typeof request.query.direcao === "string" ? request.query.direcao : undefined }); return response.json({ parcerias: resultado.registros, paginacao: { total: resultado.total, pagina: resultado.pagina, limite: resultado.limite, totalPaginas: resultado.totalPaginas } }); }
    async obter(request, response) { return response.json({ parceria: await service.obter(request.params.id, request.authUser) }); }
    async criar(request, response) { return response.status(201).json({ parceria: await service.criar(request.body, request.authUser, request.ip) }); }
    async atualizar(request, response) { return response.json({ parceria: await service.atualizar(request.params.id, request.body, request.authUser, request.ip) }); }
    async excluir(request, response) { await service.excluir(request.params.id, request.authUser, request.ip); return response.status(204).send(); }
    async criarFilho(request, response) { return response.status(201).json({ registro: await service.criarFilho(request.params.id, request.params.entidade, request.body, request.authUser, request.ip) }); }
    async atualizarFilho(request, response) { return response.json({ registro: await service.atualizarFilho(request.params.id, request.params.entidade, request.params.itemId, request.body, request.authUser, request.ip) }); }
    async excluirFilho(request, response) { await service.excluirFilho(request.params.id, request.params.entidade, request.params.itemId, request.authUser, request.ip); return response.status(204).send(); }
    async criarUnidade(request, response) { return response.status(201).json({ unidade: await service.criarUnidade(request.params.id, request.body, request.authUser) }); }
    async criarAditivo(request, response) { return response.status(201).json({ aditivo: await service.criarAditivo(request.params.id, request.body, request.authUser) }); }
}
