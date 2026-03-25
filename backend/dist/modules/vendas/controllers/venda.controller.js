import { VendaService } from "../services/venda.service.js";
export class VendaController {
    service = new VendaService();
    async listar(request, response) {
        const resultado = await this.service.listar(request.query);
        return response.json({ vendas: resultado });
    }
    async buscarPorId(request, response) {
        const resultado = await this.service.buscarPorId(request.params.id);
        return response.json(resultado);
    }
    async criar(request, response) {
        const resultado = await this.service.criar(request.body);
        return response.status(201).json(resultado);
    }
}
