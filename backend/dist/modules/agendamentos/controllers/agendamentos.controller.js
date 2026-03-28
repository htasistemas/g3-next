import { mapAgendamentoRow, mapListaEsperaRow } from "../agendamentos.mapper.js";
import { AgendamentosService } from "../services/agendamentos.service.js";
const service = new AgendamentosService();
export class AgendamentosController {
    async listar(request, response) {
        const itens = await service.listar(request.query);
        return response.json({ agendamentos: itens.map(mapAgendamentoRow) });
    }
    async listarItens(request, response) {
        const itens = await service.listarItens(request.query.tipo, request.query.busca);
        return response.json({
            itens: itens.map((item) => ({
                id: Number(item.id),
                tipo: item.tipo ?? undefined,
                nome: item.nome,
                profissionalNome: item.profissional ?? undefined,
                horario: item.horario_inicial ? String(item.horario_inicial).slice(0, 5) : undefined,
                diasSemana: item.dias_semana ?? undefined,
                local: item.sala_nome ?? item.instituicao_parceira ?? undefined
            }))
        });
    }
    async listarBeneficiarios(request, response) {
        const itens = await service.listarBeneficiarios(request.query.itemId);
        return response.json({
            beneficiarios: itens.map((item) => ({
                matriculaId: Number(item.matricula_id),
                beneficiarioId: item.beneficiario_id ? Number(item.beneficiario_id) : undefined,
                nomeCompleto: item.beneficiario_nome,
                telefone: item.telefone ?? undefined,
                email: item.email ?? undefined,
                status: item.status ?? undefined,
                profissionalNome: item.profissional_nome ?? undefined,
                selecionavel: Boolean(item.matricula_id)
            }))
        });
    }
    async obter(request, response) {
        const item = await service.obter(request.params.id);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async criar(request, response) {
        const item = await service.criar(request.body, request.authUser);
        return response.status(201).json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async atualizar(request, response) {
        const item = await service.atualizar(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async cancelar(request, response) {
        const item = await service.cancelar(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async remarcar(request, response) {
        const item = await service.remarcar(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async confirmar(request, response) {
        const item = await service.confirmar(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async checkIn(request, response) {
        const item = await service.checkIn(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async concluir(request, response) {
        const item = await service.concluir(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async listarListaEspera(_request, response) {
        const itens = await service.listarListaEspera();
        return response.json({ itens: itens.map(mapListaEsperaRow) });
    }
    async criarListaEspera(request, response) {
        const item = await service.criarListaEspera(request.body);
        return response.status(201).json({ item: item ? mapListaEsperaRow(item) : null });
    }
    async converterListaEspera(request, response) {
        const item = await service.converterListaEspera(request.params.id, request.body, request.authUser);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async indicadores(request, response) {
        const indicadores = await service.indicadores(request.query);
        return response.json({ indicadores });
    }
    async catalogos(_request, response) {
        const catalogos = await service.catalogos();
        return response.json(catalogos);
    }
    async notificar(request, response) {
        const payload = await service.notificar(request.params.id, request.body, request.authUser);
        return response.json(payload);
    }
}
