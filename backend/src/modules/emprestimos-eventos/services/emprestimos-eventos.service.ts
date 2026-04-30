import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoEmprestimosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapEmprestimoToResponse,
  mapEventoEmprestimoToResponse,
  mapMovimentacaoToResponse,
  mapResponsavelEmprestimoToResponse
} from "../emprestimos-eventos.mapper.js";
import {
  disponibilidadeQuerySchema,
  emprestimoEventoInputSchema,
  eventoEmprestimoInputSchema,
  responsavelEmprestimoInputSchema
} from "../emprestimos-eventos.schema.js";
import { EmprestimosEventosRepository } from "../repositories/emprestimos-eventos.repository.js";

function parseDateOnly(rawValue: unknown, label: string) {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    throw new AppError(`${label} invalida.`, 400);
  }
  const parsed = new Date(`${rawValue.trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${label} invalida.`, 400);
  }
  return parsed;
}

export class EmprestimosEventosService {
  private readonly repository = new EmprestimosEventosRepository();

  async listar(rawQuery: unknown, rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const filtros = this.normalizarPayload(rawQuery) as Record<string, string | undefined>;
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

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id, tenantId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criarEmprestimo(input, tenantId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizarEmprestimo(id, input, tenantId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async excluir(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.removerEmprestimo(id, tenantId);
  }

  async confirmarRetirada(rawId: string, rawUsuarioId?: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.alterarStatus(id, "RETIRADO", tenantId, usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async confirmarDevolucao(rawId: string, rawUsuarioId?: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.alterarStatus(id, "DEVOLVIDO", tenantId, usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async cancelar(rawId: string, rawUsuarioId?: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.alterarStatus(id, "CANCELADO", tenantId, usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async listarEventos(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const eventos = await this.repository.listarEventos(tenantId);
    return eventos.map(mapEventoEmprestimoToResponse);
  }

  async listarResponsaveis(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const responsaveis = await this.repository.listarResponsaveis(tenantId);
    return responsaveis.map(mapResponsavelEmprestimoToResponse);
  }

  async criarEvento(rawInput: unknown, rawTenantId?: string) {
    const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criarEvento(input, tenantId);
    return mapEventoEmprestimoToResponse(registro);
  }

  async atualizarEvento(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizarEvento(id, input, tenantId);
    return mapEventoEmprestimoToResponse(registro);
  }

  async excluirEvento(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.excluirEvento(id, tenantId);
  }

  async criarResponsavel(rawInput: unknown, rawTenantId?: string) {
    const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criarResponsavel(input, tenantId);
    return mapResponsavelEmprestimoToResponse(registro);
  }

  async atualizarResponsavel(rawId: string, rawInput: unknown, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const input = responsavelEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizarResponsavel(id, input, tenantId);
    return mapResponsavelEmprestimoToResponse(registro);
  }

  async excluirResponsavel(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.excluirResponsavel(id, tenantId);
  }

  async listarAgendaResumo(rawInicio: unknown, rawFim: unknown, rawTenantId?: string) {
    const inicio = parseDateOnly(rawInicio, "Data inicial");
    const fim = parseDateOnly(rawFim, "Data final");
    const tenantId = this.parseTenant(rawTenantId);
    if (fim < inicio) {
      throw new AppError("Data final nao pode ser menor que a inicial.", 400);
    }
    return this.repository.listarAgendaResumo(inicio, fim, tenantId);
  }

  async listarAgendaDia(rawData: unknown, rawTenantId?: string) {
    const data = parseDateOnly(rawData, "Data");
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listarAgendaDia(data, tenantId);
    return registros.map((item) => {
      const emprestimo = mapEmprestimoToResponse(item.registro, item.itens);
      return {
        emprestimoId: emprestimo.id,
        status: emprestimo.status,
        periodo: {
          retiradaPrevista: emprestimo.dataRetiradaPrevista,
          devolucaoPrevista: emprestimo.dataDevolucaoPrevista,
          retiradaReal: emprestimo.dataRetiradaReal,
          devolucaoReal: emprestimo.dataDevolucaoReal
        },
        responsavel: emprestimo.responsavel,
        evento: emprestimo.evento,
        itens: emprestimo.itens ?? []
      };
    });
  }

  async consultarDisponibilidade(rawQuery: unknown, rawTenantId?: string) {
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

  async listarMovimentacoes(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listarMovimentacoes(id, tenantId);
    return registros.map(mapMovimentacaoToResponse);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private parseOptionalId(rawId: unknown) {
    if (rawId == null || rawId === "") return undefined;
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador de usuario invalido.", 400);
    }
    return parsed;
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoEmprestimosEventos
    );
  }
}
