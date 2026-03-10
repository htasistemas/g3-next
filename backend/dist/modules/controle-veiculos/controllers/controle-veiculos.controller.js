import { ControleVeiculosService } from "../services/controle-veiculos.service.js";
const service = new ControleVeiculosService();
export class ControleVeiculosController {
    async listarVeiculos(_request, response) {
        const veiculos = await service.listarVeiculos();
        return response.json(veiculos);
    }
    async criarVeiculo(request, response) {
        const veiculo = await service.criarVeiculo(request.body);
        return response.status(201).json(veiculo);
    }
    async atualizarVeiculo(request, response) {
        const veiculo = await service.atualizarVeiculo(request.params.id, request.body);
        return response.json(veiculo);
    }
    async removerVeiculo(request, response) {
        await service.removerVeiculo(request.params.id);
        return response.status(204).send();
    }
    async listarDiario(_request, response) {
        const registros = await service.listarDiario();
        return response.json(registros);
    }
    async criarDiario(request, response) {
        const registro = await service.criarDiario(request.body);
        return response.status(201).json(registro);
    }
    async atualizarDiario(request, response) {
        const registro = await service.atualizarDiario(request.params.id, request.body);
        return response.json(registro);
    }
    async removerDiario(request, response) {
        await service.removerDiario(request.params.id);
        return response.status(204).send();
    }
    async listarMotoristasDisponiveis(request, response) {
        const motoristas = await service.listarMotoristasDisponiveis(request.query.nome);
        return response.json(motoristas);
    }
    async listarMotoristasAutorizados(request, response) {
        const motoristas = await service.listarMotoristasAutorizados(request.query.veiculoId);
        return response.json(motoristas);
    }
    async criarMotoristaAutorizado(request, response) {
        const motorista = await service.criarMotoristaAutorizado(request.body);
        return response.status(201).json(motorista);
    }
    async atualizarMotoristaAutorizado(request, response) {
        const motorista = await service.atualizarMotoristaAutorizado(request.params.id, request.body);
        return response.json(motorista);
    }
    async removerMotoristaAutorizado(request, response) {
        await service.removerMotoristaAutorizado(request.params.id);
        return response.status(204).send();
    }
}
