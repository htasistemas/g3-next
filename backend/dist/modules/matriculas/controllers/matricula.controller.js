import { MatriculaService } from "../services/matricula.service.js";
const service = new MatriculaService();
export class MatriculaController {
    async listar(request, response) {
        const matriculas = await service.listar(request.query, request.authUser?.tenant_id);
        return response.json({ matriculas });
    }
    async obterResumoCatalogo(request, response) {
        const resumo = await service.obterResumoCatalogo(request.authUser?.tenant_id);
        return response.json({ resumo });
    }
    async buscarPorId(request, response) {
        const matricula = await service.buscarPorId(request.params.id, request.authUser?.tenant_id);
        return response.json({ matricula });
    }
    async criar(request, response) {
        const matricula = await service.criar(request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(201).json({ matricula });
    }
    async atualizar(request, response) {
        const matricula = await service.atualizar(request.params.id, request.body, request.authUser?.id, request.authUser?.tenant_id);
        return response.json({ matricula });
    }
    async remover(request, response) {
        await service.remover(request.params.id, request.authUser?.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async listarBeneficiarios(request, response) {
        const beneficiarios = await service.listarBeneficiarios(request.query.termo, request.authUser?.tenant_id);
        return response.json({ beneficiarios });
    }
    async listarProfissionais(request, response) {
        const profissionais = await service.listarProfissionais(request.query.termo, request.authUser?.tenant_id);
        return response.json({ profissionais });
    }
    async listarSalas(request, response) {
        const salas = await service.listarSalas(request.authUser?.tenant_id);
        return response.json({ salas });
    }
    async listarPresencaDatas(request, response) {
        const datas = await service.listarPresencaDatas(request.params.id, request.query.pendentes, request.authUser?.tenant_id);
        return response.json({ datas });
    }
    async criarPresencaData(request, response) {
        const data = await service.criarPresencaData(request.params.id, request.body, request.authUser?.tenant_id);
        return response.status(201).json(data);
    }
    async atualizarPresencaData(request, response) {
        const data = await service.atualizarPresencaData(request.params.id, request.params.presencaDataId, request.body, request.authUser?.tenant_id);
        return response.json(data);
    }
    async cancelarPresencaData(request, response) {
        const data = await service.cancelarPresencaData(request.params.id, request.params.presencaDataId, request.authUser?.tenant_id);
        return response.json(data);
    }
    async removerPresencaData(request, response) {
        await service.removerPresencaData(request.params.id, request.params.presencaDataId, request.authUser?.tenant_id, request.authUser
            ? {
                id: request.authUser.id,
                nome: request.authUser.nome ?? request.authUser.nomeUsuario
            }
            : undefined);
        return response.status(204).send();
    }
    async listarPresencasPorData(request, response) {
        const resultado = await service.listarPresencasPorData(request.params.id, request.params.presencaDataId, request.authUser?.tenant_id);
        return response.json(resultado);
    }
    async salvarPresencasPorData(request, response) {
        const resultado = await service.salvarPresencasPorData(request.params.id, request.params.presencaDataId, request.body, request.authUser?.tenant_id, request.authUser
            ? {
                id: request.authUser.id,
                nome: request.authUser.nome ?? request.authUser.nomeUsuario
            }
            : undefined);
        return response.json(resultado);
    }
    async validarSenhaPresenca(request, response) {
        const resultado = await service.validarSenhaPresenca(request.body, request.authUser?.tenant_id, request.authUser
            ? {
                id: request.authUser.id,
                nome: request.authUser.nome ?? request.authUser.nomeUsuario
            }
            : undefined);
        return response.json(resultado);
    }
}
