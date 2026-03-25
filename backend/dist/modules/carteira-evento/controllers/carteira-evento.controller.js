import { CarteiraEventoService } from "../services/carteira-evento.service.js";
function mapAtor(request) {
    return {
        id: request.authUser?.id ? BigInt(request.authUser.id) : undefined,
        nome_usuario: request.authUser?.nomeUsuario ?? "sistema",
        nome: request.authUser?.nome
    };
}
export class CarteiraEventoController {
    service = new CarteiraEventoService();
    listarEventos(request, response) {
        return this.service.listarEventos(request.query).then((eventos) => response.json({ eventos }));
    }
    criarEvento(request, response) {
        return this.service.criarEvento(request.body).then((evento) => response.status(201).json(evento));
    }
    atualizarEvento(request, response) {
        return this.service.atualizarEvento(request.params.id, request.body).then((evento) => response.json(evento));
    }
    listarParticipantes(request, response) {
        return this.service
            .listarParticipantes(request.query)
            .then((participantes) => response.json({ participantes }));
    }
    buscarParticipante(request, response) {
        return this.service.buscarParticipante(request.params.id).then((participante) => response.json(participante));
    }
    criarParticipante(request, response) {
        return this.service.criarParticipante(request.body).then((participante) => response.status(201).json(participante));
    }
    atualizarParticipante(request, response) {
        return this.service
            .atualizarParticipante(request.params.id, request.body)
            .then((participante) => response.json(participante));
    }
    listarBarracas(request, response) {
        return this.service.listarBarracas(request.query).then((barracas) => response.json({ barracas }));
    }
    criarBarraca(request, response) {
        return this.service.criarBarraca(request.body).then((barraca) => response.status(201).json(barraca));
    }
    atualizarBarraca(request, response) {
        return this.service.atualizarBarraca(request.params.id, request.body).then((barraca) => response.json(barraca));
    }
    listarItens(request, response) {
        return this.service.listarItens(request.query).then((itens) => response.json({ itens }));
    }
    criarItem(request, response) {
        return this.service.criarItem(request.body).then((item) => response.status(201).json(item));
    }
    atualizarItem(request, response) {
        return this.service.atualizarItem(request.params.id, request.body).then((item) => response.json(item));
    }
    recarregar(request, response) {
        return this.service.recarregar(request.body, mapAtor(request)).then((participante) => response.json(participante));
    }
    transferir(request, response) {
        return this.service.transferir(request.body, mapAtor(request)).then((resultado) => response.json(resultado));
    }
    ajustar(request, response) {
        return this.service.ajustar(request.body, mapAtor(request)).then((participante) => response.json(participante));
    }
    alterarStatusParticipante(request, response) {
        return this.service
            .alterarStatusParticipante(request.params.id, request.body, mapAtor(request))
            .then((participante) => response.json(participante));
    }
    emitirSegundaVia(request, response) {
        return this.service
            .emitirSegundaVia(request.params.id, request.body, mapAtor(request))
            .then((participante) => response.json(participante));
    }
    consultarToken(request, response) {
        return this.service.consultarToken(request.body).then((participante) => response.json(participante));
    }
    realizarVenda(request, response) {
        return this.service.realizarVenda(request.body, mapAtor(request)).then((venda) => response.status(201).json(venda));
    }
    listarExtrato(request, response) {
        return this.service.listarExtrato(request.query).then((extrato) => response.json(extrato));
    }
    obterDashboard(request, response) {
        return this.service.obterDashboard(request.query).then((dashboard) => response.json(dashboard));
    }
    obterFechamento(request, response) {
        return this.service.obterFechamento(request.query).then((fechamento) => response.json(fechamento));
    }
    obterRelatorio(request, response) {
        return this.service.obterRelatorio(request.query).then((relatorio) => response.json(relatorio));
    }
}
