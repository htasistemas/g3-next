import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoEmprestimosEventos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapEmprestimoToResponse,
  mapEventoEmprestimoToResponse,
  mapMovimentacaoToResponse
} from "../emprestimos-eventos.mapper.js";
import {
  disponibilidadeQuerySchema,
  emprestimoEventoInputSchema,
  eventoEmprestimoInputSchema
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

  async listar(rawQuery: unknown) {
    const filtros = this.normalizarPayload(rawQuery) as Record<string, string | undefined>;
    const registros = await this.repository.listarEmprestimos({
      inicio: filtros.inicio,
      fim: filtros.fim,
      status: filtros.status,
      evento: filtros.evento,
      item: filtros.item,
      unidade: filtros.unidade
    });

    return registros.map((item) => mapEmprestimoToResponse(item.registro, item.itens));
  }

  async obter(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarEmprestimoPorIdOuFalhar(id);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async criar(rawInput: unknown) {
    const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarEmprestimo(input);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = emprestimoEventoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarEmprestimo(id, input);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async excluir(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerEmprestimo(id);
  }

  async confirmarRetirada(rawId: string, rawUsuarioId?: unknown) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const registro = await this.repository.alterarStatus(id, "RETIRADO", usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async confirmarDevolucao(rawId: string, rawUsuarioId?: unknown) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const registro = await this.repository.alterarStatus(id, "DEVOLVIDO", usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async cancelar(rawId: string, rawUsuarioId?: unknown) {
    const id = this.parseId(rawId);
    const usuarioId = this.parseOptionalId(rawUsuarioId);
    const registro = await this.repository.alterarStatus(id, "CANCELADO", usuarioId);
    return mapEmprestimoToResponse(registro.registro, registro.itens);
  }

  async listarEventos() {
    const eventos = await this.repository.listarEventos();
    return eventos.map(mapEventoEmprestimoToResponse);
  }

  async criarEvento(rawInput: unknown) {
    const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarEvento(input);
    return mapEventoEmprestimoToResponse(registro);
  }

  async atualizarEvento(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = eventoEmprestimoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarEvento(id, input);
    return mapEventoEmprestimoToResponse(registro);
  }

  async excluirEvento(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.excluirEvento(id);
  }

  async listarAgendaResumo(rawInicio: unknown, rawFim: unknown) {
    const inicio = parseDateOnly(rawInicio, "Data inicial");
    const fim = parseDateOnly(rawFim, "Data final");
    if (fim < inicio) {
      throw new AppError("Data final nao pode ser menor que a inicial.", 400);
    }
    return this.repository.listarAgendaResumo(inicio, fim);
  }

  async listarAgendaDia(rawData: unknown) {
    const data = parseDateOnly(rawData, "Data");
    const registros = await this.repository.listarAgendaDia(data);
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

  async consultarDisponibilidade(rawQuery: unknown) {
    const input = disponibilidadeQuerySchema.parse(rawQuery);
    return this.repository.consultarDisponibilidade({
      itemId: input.itemId,
      tipoItem: input.tipoItem,
      quantidade: input.quantidade,
      inicio: new Date(input.inicio),
      fim: new Date(input.fim),
      emprestimoId: input.emprestimoId
    });
  }

  async listarMovimentacoes(rawId: string) {
    const id = this.parseId(rawId);
    const registros = await this.repository.listarMovimentacoes(id);
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

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoEmprestimosEventos
    );
  }
}
