import { AppError } from "../../../shared/errors/app-error.js";
import { normalizarEmail, validarEmail } from "../../../utils/br-utils.js";
import { mapaCamposTextoEmprestimosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { EmailService } from "../../email/services/email.service.js";
import { mapEmprestimoToResponse, mapEventoEmprestimoToResponse, mapMovimentacaoToResponse, mapResponsavelEmprestimoToResponse } from "../emprestimos-eventos.mapper.js";
import { disponibilidadeQuerySchema, emprestimoEventoInputSchema, eventoEmprestimoInputSchema, responsavelEmprestimoInputSchema } from "../emprestimos-eventos.schema.js";
import { formatDateTimeLocal, parseDateOnlyLocal } from "../emprestimos-eventos-datetime.js";
import { EmprestimosEventosRepository } from "../repositories/emprestimos-eventos.repository.js";
function parseDateOnly(rawValue, label) {
    if (typeof rawValue !== "string" || !rawValue.trim()) {
        throw new AppError(`${label} invalida.`, 400);
    }
    const parsed = parseDateOnlyLocal(rawValue.trim());
    if (!parsed) {
        throw new AppError(`${label} invalida.`, 400);
    }
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError(`${label} invalida.`, 400);
    }
    return parsed;
}
export class EmprestimosEventosService {
    repository = new EmprestimosEventosRepository();
    emailService = new EmailService();
    async listar(rawQuery, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const filtros = this.normalizarPayload(rawQuery);
        const registros = await this.repository.listarEmprestimos({
            inicio: filtros.inicio,
            fim: filtros.fim,
            status: filtros.status,
            evento: filtros.evento,
            item: filtros.item,
            unidade: filtros.unidade
        }, tenantId);
        return registros.map((item) => mapEmprestimoToResponse(item.registro, item.itens));
    }
    async obter(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id, tenantId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async criar(rawInput, rawTenantId) {
        const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarEmprestimo(input, tenantId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async atualizar(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizarEmprestimo(id, input, tenantId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async excluir(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerEmprestimo(id, tenantId);
    }
    async confirmarRetirada(rawId, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.alterarStatus(id, "RETIRADO", tenantId, usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async confirmarReserva(rawId, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.alterarStatus(id, "AGENDADO", tenantId, usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async confirmarDevolucao(rawId, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.alterarStatus(id, "DEVOLVIDO", tenantId, usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async cancelar(rawId, rawUsuarioId, rawTenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseOptionalId(rawUsuarioId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.alterarStatus(id, "CANCELADO", tenantId, usuarioId);
        return mapEmprestimoToResponse(registro.registro, registro.itens);
    }
    async listarEventos(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const eventos = await this.repository.listarEventos(tenantId);
        return eventos.map(mapEventoEmprestimoToResponse);
    }
    async listarResponsaveis(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const responsaveis = await this.repository.listarResponsaveis(tenantId);
        return responsaveis.map(mapResponsavelEmprestimoToResponse);
    }
    async criarEvento(rawInput, rawTenantId) {
        const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarEvento(input, tenantId);
        return mapEventoEmprestimoToResponse(registro);
    }
    async atualizarEvento(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizarEvento(id, input, tenantId);
        return mapEventoEmprestimoToResponse(registro);
    }
    async excluirEvento(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.excluirEvento(id, tenantId);
    }
    async criarResponsavel(rawInput, rawTenantId) {
        const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarResponsavel(input, tenantId);
        return mapResponsavelEmprestimoToResponse(registro);
    }
    async atualizarResponsavel(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.atualizarResponsavel(id, input, tenantId);
        return mapResponsavelEmprestimoToResponse(registro);
    }
    async excluirResponsavel(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.excluirResponsavel(id, tenantId);
    }
    async listarAgendaResumo(rawInicio, rawFim, rawTenantId) {
        const inicio = parseDateOnly(rawInicio, "Data inicial");
        const fim = parseDateOnly(rawFim, "Data final");
        const tenantId = this.parseTenant(rawTenantId);
        if (fim < inicio) {
            throw new AppError("Data final nao pode ser menor que a inicial.", 400);
        }
        return this.repository.listarAgendaResumo(inicio, fim, tenantId);
    }
    async listarAgendaDia(rawData, rawTenantId) {
        const data = parseDateOnly(rawData, "Data");
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarAgendaDia(data, tenantId);
        return registros.map((item) => {
            const emprestimo = mapEmprestimoToResponse(item.registro, item.itens);
            return {
                emprestimoId: emprestimo.id,
                status: emprestimo.status,
                tipoDia: item.tipoDia,
                periodo: {
                    retiradaPrevista: emprestimo.dataRetiradaPrevista,
                    devolucaoPrevista: emprestimo.dataDevolucaoPrevista,
                    retiradaReal: emprestimo.dataRetiradaReal,
                    devolucaoReal: emprestimo.dataDevolucaoReal,
                    retiradaApoio: formatDateTimeLocal(item.apoio?.retirada),
                    eventoInicio: formatDateTimeLocal(item.apoio?.eventoInicio),
                    eventoFim: formatDateTimeLocal(item.apoio?.eventoFim),
                    devolucaoApoio: formatDateTimeLocal(item.apoio?.devolucao)
                },
                responsavel: emprestimo.responsavel,
                evento: emprestimo.evento,
                itens: emprestimo.itens ?? []
            };
        });
    }
    async consultarDisponibilidade(rawQuery, rawTenantId) {
        const input = disponibilidadeQuerySchema.parse(rawQuery);
        const tenantId = this.parseTenant(rawTenantId);
        return this.repository.consultarDisponibilidade({
            itemId: input.itemId,
            tipoItem: input.tipoItem,
            quantidade: input.quantidade,
            inicio: new Date(input.inicio),
            fim: new Date(input.fim),
            emprestimoId: input.emprestimoId
        }, tenantId);
    }
    async listarMovimentacoes(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarMovimentacoes(id, tenantId);
        return registros.map(mapMovimentacaoToResponse);
    }
    async enviarAlertaDevolucaoEmail(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id, tenantId);
        const emprestimo = mapEmprestimoToResponse(registro.registro, registro.itens);
        if (emprestimo.status === "DEVOLVIDO" || emprestimo.status === "CANCELADO") {
            throw new AppError("Este emprestimo nao possui devolucao pendente.", 422);
        }
        if (!emprestimo.dataDevolucaoPrevista) {
            throw new AppError("Emprestimo sem data de devolucao prevista.", 422);
        }
        const devolucaoPrevista = new Date(emprestimo.dataDevolucaoPrevista);
        if (Number.isNaN(devolucaoPrevista.getTime()) || devolucaoPrevista.getTime() >= Date.now()) {
            throw new AppError("A devolucao prevista ainda nao esta vencida.", 422);
        }
        if (!registro.registro.responsavel_id) {
            throw new AppError("Emprestimo sem responsavel cadastrado para envio de e-mail.", 422);
        }
        const responsavel = await this.repository.buscarResponsavelPorId(registro.registro.responsavel_id, tenantId);
        const destinatario = normalizarEmail(responsavel?.email);
        if (!destinatario || !validarEmail(destinatario)) {
            throw new AppError("O responsavel nao possui e-mail valido cadastrado.", 422);
        }
        const nomeInstituicao = await this.repository.obterNomeInstituicao(tenantId);
        const assunto = `Alerta de devolucao vencida - Emprestimo #${emprestimo.id ?? ""}`;
        const mensagem = this.montarMensagemAlertaDevolucao(emprestimo, responsavel?.nome ?? emprestimo.responsavel?.nome, nomeInstituicao);
        const envio = await this.emailService.enviarEmailSimples({
            destinatario,
            assunto,
            mensagem
        });
        return {
            destinatario: envio.destinatario,
            enviadoEm: envio.enviadoEm
        };
    }
    async enviarConfirmacaoReservaEmail(rawId, rawTenantId) {
        const preview = await this.montarPreviewConfirmacaoReservaEmail(rawId, rawTenantId);
        const envio = await this.emailService.enviarEmailSimples(preview);
        return {
            destinatario: envio.destinatario,
            enviadoEm: envio.enviadoEm
        };
    }
    async obterPreviewConfirmacaoReservaEmail(rawId, rawTenantId) {
        return this.montarPreviewConfirmacaoReservaEmail(rawId, rawTenantId);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseOptionalId(rawId) {
        if (rawId == null || rawId === "")
            return undefined;
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador de usuario invalido.", 400);
        }
        return parsed;
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoEmprestimosEventos);
    }
    montarMensagemAlertaDevolucao(emprestimo, nomeResponsavel, nomeInstituicao = "Instituição") {
        const itens = this.formatarItensMensagem(emprestimo);
        return [
            `Ola, ${nomeResponsavel?.trim() || "responsavel"}.`,
            "",
            `${nomeInstituicao} informa que consta em aberto a devolucao do emprestimo #${emprestimo.id ?? ""} vinculado ao evento ${emprestimo.evento.titulo}.`,
            `A devolucao prevista era ${emprestimo.dataDevolucaoPrevista}.`,
            `Status atual: ${emprestimo.status}.`,
            "",
            itens ? "Itens vinculados:" : undefined,
            itens || undefined,
            emprestimo.observacoes?.trim() ? "" : undefined,
            emprestimo.observacoes?.trim() ? `Observações do empréstimo:\n${emprestimo.observacoes.trim()}` : undefined,
            "",
            "Solicitamos confirmar a devolucao dos itens ou entrar em contato com a instituicao para regularizacao.",
            "",
            `Mensagem automatica enviada por ${nomeInstituicao} pelo G3N.`
        ]
            .filter((linha) => linha !== undefined)
            .join("\n");
    }
    montarMensagemConfirmacaoReserva(emprestimo, nomeResponsavel, nomeInstituicao = "Instituição") {
        const itens = this.formatarItensMensagem(emprestimo);
        return [
            `Ola, ${nomeResponsavel?.trim() || "responsavel"}.`,
            "",
            `${nomeInstituicao} confirma a reserva dos itens para o evento ${emprestimo.evento.titulo}.`,
            `Periodo do evento: ${emprestimo.dataRetiradaPrevista} ate ${emprestimo.dataDevolucaoPrevista}.`,
            `Status da reserva: ${emprestimo.status}.`,
            "",
            itens ? "Itens reservados:" : undefined,
            itens || undefined,
            emprestimo.observacoes?.trim() ? "" : undefined,
            emprestimo.observacoes?.trim() ? `Observações do empréstimo:\n${emprestimo.observacoes.trim()}` : undefined,
            "",
            "Os itens ficam reservados para a data informada. Em caso de alteracao, entre em contato com a instituicao.",
            "",
            `Mensagem automatica enviada por ${nomeInstituicao} pelo G3N.`
        ]
            .filter((linha) => linha !== undefined)
            .join("\n");
    }
    formatarItensMensagem(emprestimo) {
        return (emprestimo.itens ?? [])
            .map((item) => {
            const nome = item.nomeItem || `Item #${item.itemId}`;
            const patrimonio = item.numeroPatrimonio ? ` - patrimonio ${item.numeroPatrimonio}` : "";
            return `- ${item.quantidade}x ${nome}${patrimonio}`;
        })
            .join("\n");
    }
    async montarPreviewConfirmacaoReservaEmail(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id, tenantId);
        const emprestimo = mapEmprestimoToResponse(registro.registro, registro.itens);
        if (emprestimo.status === "CANCELADO") {
            throw new AppError("Nao e possivel confirmar reserva cancelada.", 422);
        }
        if (!registro.registro.responsavel_id) {
            throw new AppError("Emprestimo sem responsavel cadastrado para envio de e-mail.", 422);
        }
        const responsavel = await this.repository.buscarResponsavelPorId(registro.registro.responsavel_id, tenantId);
        const destinatario = normalizarEmail(responsavel?.email);
        if (!destinatario || !validarEmail(destinatario)) {
            throw new AppError("O responsavel nao possui e-mail valido cadastrado.", 422);
        }
        const nomeInstituicao = await this.repository.obterNomeInstituicao(tenantId);
        return {
            destinatario,
            assunto: `Confirmacao de reserva - ${emprestimo.evento.titulo}`,
            mensagem: this.montarMensagemConfirmacaoReserva(emprestimo, responsavel?.nome ?? emprestimo.responsavel?.nome, nomeInstituicao)
        };
    }
}
