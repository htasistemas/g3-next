import { mapAgendamentoRow, mapListaEsperaRow } from "../agendamentos.mapper.js";
import { AgendamentosService } from "../services/agendamentos.service.js";
const service = new AgendamentosService();
function listarProfissionaisRelacionados(valor) {
    const profissionais = [];
    for (const nome of String(valor ?? "").split(/[;,]/g).map((item) => item.trim()).filter(Boolean)) {
        if (!profissionais.some((atual) => atual.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) {
            profissionais.push(nome);
        }
    }
    return profissionais;
}
export class AgendamentosController {
    async listar(request, response) {
        const itens = await service.listar(request.query, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamentos: itens.map(mapAgendamentoRow) });
    }
    async listarItens(request, response) {
        const itens = await service.listarItens(request.query.tipo, request.query.busca, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({
            itens: itens.map((item) => ({
                id: Number(item.id),
                tipo: item.tipo ?? undefined,
                nome: item.nome,
                profissionalNome: item.profissional ?? undefined,
                profissionais: listarProfissionaisRelacionados(item.profissional),
                horario: item.horario_inicial ? String(item.horario_inicial).slice(0, 5) : undefined,
                controleHorarioAtendimento: Boolean(item.controle_horario_atendimento),
                horarioFinal: item.horario_final_atendimento ? String(item.horario_final_atendimento).slice(0, 5) : undefined,
                duracaoMinutos: item.intervalo_atendimento_minutos ?? item.duracao_horas ?? undefined,
                diasSemana: item.dias_semana ?? undefined,
                local: item.sala_nome ?? item.instituicao_parceira ?? undefined
            }))
        });
    }
    async listarBeneficiarios(request, response) {
        const itens = await service.listarBeneficiarios(request.query.itemId, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({
            beneficiarios: itens.map((item) => ({
                matriculaId: Number(item.matricula_id),
                beneficiarioId: item.beneficiario_id ? Number(item.beneficiario_id) : undefined,
                nomeCompleto: item.beneficiario_nome,
                dataNascimento: item.data_nascimento ? item.data_nascimento.toISOString().slice(0, 10) : undefined,
                telefone: item.telefone ?? undefined,
                email: item.email ?? undefined,
                status: item.status ?? undefined,
                profissionalNome: item.profissional_nome ?? undefined,
                selecionavel: Boolean(item.matricula_id)
            }))
        });
    }
    async obter(request, response) {
        const item = await service.obter(request.params.id, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async criar(request, response) {
        const item = await service.criar(request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.status(201).json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async atualizar(request, response) {
        const item = await service.atualizar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async cancelar(request, response) {
        const item = await service.cancelar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async excluir(request, response) {
        const item = await service.excluir(request.params.id, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async remarcar(request, response) {
        const item = await service.remarcar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async copiar(request, response) {
        const item = await service.copiar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.status(201).json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async confirmar(request, response) {
        const item = await service.confirmar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async checkIn(request, response) {
        const item = await service.checkIn(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async concluir(request, response) {
        const item = await service.concluir(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async listarListaEspera(_request, response) {
        const itens = await service.listarListaEspera(_request.authUser?.tenant_id, _request.authUser?.instituicao_slug);
        return response.json({ itens: itens.map(mapListaEsperaRow) });
    }
    async criarListaEspera(request, response) {
        const item = await service.criarListaEspera(request.body, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.status(201).json({ item: item ? mapListaEsperaRow(item) : null });
    }
    async converterListaEspera(request, response) {
        const item = await service.converterListaEspera(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ agendamento: item ? mapAgendamentoRow(item) : null });
    }
    async indicadores(request, response) {
        const indicadores = await service.indicadores(request.query, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json({ indicadores });
    }
    async catalogos(_request, response) {
        const catalogos = await service.catalogos(_request.authUser?.tenant_id, _request.authUser?.instituicao_slug);
        return response.json(catalogos);
    }
    async notificar(request, response) {
        const payload = await service.notificar(request.params.id, request.body, request.authUser, request.authUser?.tenant_id, request.authUser?.instituicao_slug);
        return response.json(payload);
    }
}
