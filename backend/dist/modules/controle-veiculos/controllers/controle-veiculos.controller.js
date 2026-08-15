import { ControleVeiculosService } from "../services/controle-veiculos.service.js";
const service = new ControleVeiculosService();
export class ControleVeiculosController {
    async listarVeiculos(request, response) {
        const veiculos = await service.listarVeiculos(request.authUser?.tenant_id);
        return response.json(veiculos);
    }
    async criarVeiculo(request, response) {
        const veiculo = await service.criarVeiculo(request.body, request.authUser?.tenant_id);
        return response.status(201).json(veiculo);
    }
    async atualizarVeiculo(request, response) {
        const veiculo = await service.atualizarVeiculo(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(veiculo);
    }
    async removerVeiculo(request, response) {
        await service.removerVeiculo(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async listarDiario(request, response) {
        const registros = await service.listarDiario(request.authUser?.tenant_id);
        return response.json(registros);
    }
    async criarDiario(request, response) {
        const registro = await service.criarDiario(request.body, request.authUser?.tenant_id);
        return response.status(201).json(registro);
    }
    async atualizarDiario(request, response) {
        const registro = await service.atualizarDiario(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(registro);
    }
    async removerDiario(request, response) {
        await service.removerDiario(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async listarLocaisDestino(request, response) {
        const locais = await service.listarLocaisDestino(request.authUser?.tenant_id);
        return response.json(locais);
    }
    async criarLocalDestino(request, response) {
        const local = await service.criarLocalDestino(request.body, request.authUser?.tenant_id);
        return response.status(201).json(local);
    }
    async atualizarLocalDestino(request, response) {
        const local = await service.atualizarLocalDestino(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(local);
    }
    async removerLocalDestino(request, response) {
        await service.removerLocalDestino(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
    async listarMotoristasDisponiveis(request, response) {
        const motoristas = await service.listarMotoristasDisponiveis(request.query.nome, request.authUser?.tenant_id);
        return response.json(motoristas);
    }
    async listarMotoristasAutorizados(request, response) {
        const motoristas = await service.listarMotoristasAutorizados(request.query.veiculoId, request.authUser?.tenant_id);
        return response.json(motoristas);
    }
    async criarMotoristaAutorizado(request, response) {
        const motorista = await service.criarMotoristaAutorizado(request.body, request.authUser?.tenant_id);
        return response.status(201).json(motorista);
    }
    async atualizarMotoristaAutorizado(request, response) {
        const motorista = await service.atualizarMotoristaAutorizado(request.params.id, request.body, request.authUser?.tenant_id);
        return response.json(motorista);
    }
    async removerMotoristaAutorizado(request, response) {
        await service.removerMotoristaAutorizado(request.params.id, request.authUser?.tenant_id);
        return response.status(204).send();
    }
}
