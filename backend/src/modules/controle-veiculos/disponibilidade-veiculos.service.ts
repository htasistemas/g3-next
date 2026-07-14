import { AppError } from "../../shared/errors/app-error.js";
import {
  disponibilidadeVeiculoConsultaSchema,
  disponibilidadeVeiculoInputSchema
} from "./controle-veiculos.schema.js";
import { ControleVeiculosDisponibilidadeRepository } from "./disponibilidade-veiculos.repository.js";

export class ControleVeiculosDisponibilidadeService {
  private readonly repository = new ControleVeiculosDisponibilidadeRepository();

  async listar(tenantId?: string) {
    return this.repository.listarDisponibilidades(this.parseTenant(tenantId));
  }

  async consultar(rawQuery: unknown, tenantId?: string) {
    const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery) as {
      dataHoraInicio: string;
      dataHoraFim: string;
      veiculoId?: number | null;
      situacao?: "RESERVADO" | "INDISPONIVEL" | "DISPONIVEL" | null;
      unidade?: string | null;
      responsavel?: string | null;
      motivo?: string | null;
    };
    return this.repository.consultarDisponibilidade(this.parseTenant(tenantId), consulta);
  }

  async resumo(rawQuery: unknown, tenantId?: string) {
    const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery) as {
      dataHoraInicio: string;
      dataHoraFim: string;
      veiculoId?: number | null;
      situacao?: "RESERVADO" | "INDISPONIVEL" | "DISPONIVEL" | null;
      unidade?: string | null;
      responsavel?: string | null;
      motivo?: string | null;
    };
    return this.repository.resumoDisponibilidade(this.parseTenant(tenantId), consulta);
  }

  async agendaVeiculo(rawVeiculoId: string, rawQuery: unknown, tenantId?: string) {
    const veiculoId = this.parseId(rawVeiculoId);
    const consulta = disponibilidadeVeiculoConsultaSchema.parse(rawQuery) as {
      dataHoraInicio: string;
      dataHoraFim: string;
      veiculoId?: number | null;
      situacao?: "RESERVADO" | "INDISPONIVEL" | "DISPONIVEL" | null;
      unidade?: string | null;
      responsavel?: string | null;
      motivo?: string | null;
    };
    if (!consulta.dataHoraInicio || !consulta.dataHoraFim) {
      throw new AppError("Informe o periodo da agenda.", 400);
    }
    return this.repository.agendaVeiculo(
      this.parseTenant(tenantId),
      veiculoId,
      new Date(consulta.dataHoraInicio),
      new Date(consulta.dataHoraFim)
    );
  }

  async proximaDisponibilidade(rawVeiculoId: string, tenantId?: string) {
    const veiculoId = this.parseId(rawVeiculoId);
    return this.repository.proximaDisponibilidade(this.parseTenant(tenantId), veiculoId, new Date());
  }

  async criar(rawInput: unknown, tenantId?: string, usuario?: { id?: bigint; nome?: string | null }) {
    const input = disponibilidadeVeiculoInputSchema.parse(rawInput) as {
      veiculoId: number;
      dataHoraInicio: string;
      dataHoraFim: string;
      tipoSituacao: "RESERVADO" | "INDISPONIVEL";
      motivo?: string | null;
      motivoDetalhado?: string | null;
      destino?: string | null;
      responsavelNome?: string | null;
      observacoes?: string | null;
      statusRegistro?: "ATIVO" | "CANCELADO" | "ENCERRADO" | "EXCLUIDO_LOGICAMENTE";
    };
    return this.repository.criar(input, this.parseTenant(tenantId), usuario);
  }

  async atualizar(
    rawId: string,
    rawInput: unknown,
    tenantId?: string,
    usuario?: { id?: bigint; nome?: string | null }
  ) {
    const id = this.parseId(rawId);
    const input = disponibilidadeVeiculoInputSchema.parse(rawInput) as {
      veiculoId: number;
      dataHoraInicio: string;
      dataHoraFim: string;
      tipoSituacao: "RESERVADO" | "INDISPONIVEL";
      motivo?: string | null;
      motivoDetalhado?: string | null;
      destino?: string | null;
      responsavelNome?: string | null;
      observacoes?: string | null;
      statusRegistro?: "ATIVO" | "CANCELADO" | "ENCERRADO" | "EXCLUIDO_LOGICAMENTE";
    };
    return this.repository.atualizar(id, input, this.parseTenant(tenantId), usuario);
  }

  async cancelar(
    rawId: string,
    rawInput: unknown,
    tenantId?: string,
    usuario?: { id?: bigint; nome?: string | null }
  ) {
    const id = this.parseId(rawId);
    const motivoCancelamento =
      typeof rawInput === "object" && rawInput && "motivoCancelamento" in rawInput
        ? String((rawInput as Record<string, unknown>).motivoCancelamento ?? "").trim()
        : "";
    if (!motivoCancelamento) {
      throw new AppError("Informe o motivo do cancelamento.", 400);
    }
    return this.repository.cancelar(id, this.parseTenant(tenantId), motivoCancelamento, usuario);
  }

  async encerrar(rawId: string, tenantId?: string, usuario?: { id?: bigint; nome?: string | null }) {
    const id = this.parseId(rawId);
    return this.repository.encerrar(id, this.parseTenant(tenantId), usuario);
  }

  async excluir(rawId: string, tenantId?: string, usuario?: { id?: bigint; nome?: string | null }) {
    const id = this.parseId(rawId);
    return this.repository.excluir(id, this.parseTenant(tenantId), usuario);
  }

  async detalhes(rawId: string, tenantId?: string) {
    const id = this.parseId(rawId);
    return this.repository.obterPorId(id, this.parseTenant(tenantId));
  }

  async listarVeiculosAtivos(tenantId?: string) {
    return this.repository.listarVeiculosAtivos(this.parseTenant(tenantId));
  }

  private parseId(rawId: string) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return id;
  }

  private parseTenant(tenantId?: string) {
    const valor = tenantId?.trim();
    if (!valor) {
      throw new AppError("Tenant da sessão não identificado.", 401);
    }
    return valor;
  }
}
