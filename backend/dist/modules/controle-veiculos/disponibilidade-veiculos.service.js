import { AppError } from "../../shared/errors/app-error.js";
import { disponibilidadeVeiculoConsultaSchema, disponibilidadeVeiculoInputSchema } from "./controle-veiculos.schema.js";
import { ControleVeiculosDisponibilidadeRepository } from "./disponibilidade-veiculos.repository.js";
export class ControleVeiculosDisponibilidadeService {
    repository = new ControleVeiculosDisponibilidadeRepository();
    async listar(tenantId) {
        return this.repository.listarDisponibilidades(this.parseTenant(tenantId));
    }
    async consultar(rawQuery, tenantId) {
        const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery);
        return this.repository.consultarDisponibilidade(this.parseTenant(tenantId), consulta);
    }
    async resumo(rawQuery, tenantId) {
        const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery);
        return this.repository.resumoDisponibilidade(this.parseTenant(tenantId), consulta);
    }
    async agendaVeiculo(rawVeiculoId, rawQuery, tenantId) {
        const veiculoId = this.parseId(rawVeiculoId);
        const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery);
        if (!consulta.dataHoraInicio || !consulta.dataHoraFim) {
            throw new AppError("Informe o periodo da agenda.", 400);
        }
        return this.repository.agendaVeiculo(this.parseTenant(tenantId), veiculoId, new Date(consulta.dataHoraInicio), new Date(consulta.dataHoraFim));
    }
    async proximaDisponibilidade(rawVeiculoId, tenantId) {
        const veiculoId = this.parseId(rawVeiculoId);
        return this.repository.proximaDisponibilidade(this.parseTenant(tenantId), veiculoId, new Date());
    }
    async criar(rawInput, tenantId, usuario) {
        const input = disponibilidadeVeiculoInputSchema.parse(rawInput);
        return this.repository.criar(input, this.parseTenant(tenantId), usuario);
    }
    async atualizar(rawId, rawInput, tenantId, usuario) {
        const id = this.parseId(rawId);
        const input = disponibilidadeVeiculoInputSchema.parse(rawInput);
        return this.repository.atualizar(id, input, this.parseTenant(tenantId), usuario);
    }
    async cancelar(rawId, rawInput, tenantId, usuario) {
        const id = this.parseId(rawId);
        const motivoCancelamento = typeof rawInput === "object" && rawInput && "motivoCancelamento" in rawInput
            ? String(rawInput.motivoCancelamento ?? "").trim()
            : "";
        if (!motivoCancelamento) {
            throw new AppError("Informe o motivo do cancelamento.", 400);
        }
        return this.repository.cancelar(id, this.parseTenant(tenantId), motivoCancelamento, usuario);
    }
    async encerrar(rawId, tenantId, usuario) {
        const id = this.parseId(rawId);
        return this.repository.encerrar(id, this.parseTenant(tenantId), usuario);
    }
    async excluir(rawId, tenantId, usuario) {
        const id = this.parseId(rawId);
        return this.repository.excluir(id, this.parseTenant(tenantId), usuario);
    }
    async detalhes(rawId, tenantId) {
        const id = this.parseId(rawId);
        return this.repository.obterPorId(id, this.parseTenant(tenantId));
    }
    async listarVeiculosAtivos(tenantId) {
        return this.repository.listarVeiculosAtivos(this.parseTenant(tenantId));
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador inválido.", 400);
        }
        return id;
    }
    parseTenant(tenantId) {
        const valor = tenantId?.trim();
        if (!valor) {
            throw new AppError("Tenant da sessão não identificado.", 401);
        }
        return valor;
    }
}
