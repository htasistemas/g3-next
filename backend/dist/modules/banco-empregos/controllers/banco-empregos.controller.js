import { BancoEmpregosService } from "../services/banco-empregos.service.js";
const service = new BancoEmpregosService();
export class BancoEmpregosController {
    async listar(_request, response) {
        const vagas = await service.listar();
        return response.json(vagas);
    }
    async obter(request, response) {
        const vaga = await service.obter(request.params.id);
        return response.json(vaga);
    }
    async criar(request, response) {
        const vaga = await service.criar(request.body);
        return response.status(201).json(vaga);
    }
    async atualizar(request, response) {
        const vaga = await service.atualizar(request.params.id, request.body);
        return response.json(vaga);
    }
    async excluir(request, response) {
        await service.remover(request.params.id);
        return response.status(204).send();
    }
    async listarCandidatos(request, response) {
        const candidatos = await service.listarCandidatos(request.params.id);
        return response.json(candidatos);
    }
    async criarCandidato(request, response) {
        const candidato = await service.criarCandidato(request.params.id, request.body);
        return response.status(201).json(candidato);
    }
    async removerCandidato(request, response) {
        await service.removerCandidato(request.params.candidatoId);
        return response.status(204).send();
    }
}
