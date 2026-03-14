import { MatriculaService } from "../services/matricula.service.js";
const service = new MatriculaService();
export class MatriculaController {
    async listar(request, response) {
        const matriculas = await service.listar(request.query);
        return response.json({ matriculas });
    }
    async obterResumoCatalogo(_request, response) {
        const resumo = await service.obterResumoCatalogo();
        return response.json({ resumo });
    }
    async buscarPorId(request, response) {
        const matricula = await service.buscarPorId(request.params.id);
        return response.json({ matricula });
    }
    async criar(request, response) {
        const matricula = await service.criar(request.body, request.authUser?.id);
        return response.status(201).json({ matricula });
    }
    async atualizar(request, response) {
        const matricula = await service.atualizar(request.params.id, request.body, request.authUser?.id);
        return response.json({ matricula });
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id);
        return response.status(204).send();
    }
    async listarBeneficiarios(request, response) {
        const beneficiarios = await service.listarBeneficiarios(request.query.termo);
        return response.json({ beneficiarios });
    }
    async listarProfissionais(request, response) {
        const profissionais = await service.listarProfissionais(request.query.termo);
        return response.json({ profissionais });
    }
    async listarSalas(_request, response) {
        const salas = await service.listarSalas();
        return response.json({ salas });
    }
    async listarPresencaDatas(request, response) {
        const datas = await service.listarPresencaDatas(request.params.id, request.query.pendentes);
        return response.json({ datas });
    }
    async criarPresencaData(request, response) {
        const data = await service.criarPresencaData(request.params.id, request.body);
        return response.status(201).json(data);
    }
    async atualizarPresencaData(request, response) {
        const data = await service.atualizarPresencaData(request.params.id, request.params.presencaDataId, request.body);
        return response.json(data);
    }
    async cancelarPresencaData(request, response) {
        const data = await service.cancelarPresencaData(request.params.id, request.params.presencaDataId);
        return response.json(data);
    }
    async removerPresencaData(request, response) {
        await service.removerPresencaData(request.params.id, request.params.presencaDataId);
        return response.status(204).send();
    }
    async listarPresencasPorData(request, response) {
        const resultado = await service.listarPresencasPorData(request.params.id, request.params.presencaDataId);
        return response.json(resultado);
    }
    async salvarPresencasPorData(request, response) {
        const resultado = await service.salvarPresencasPorData(request.params.id, request.params.presencaDataId, request.body);
        return response.json(resultado);
    }
}
