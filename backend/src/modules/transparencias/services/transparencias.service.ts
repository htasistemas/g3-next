import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPrestacaoContas } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTransparenciaToResponse } from "../transparencias.mapper.js";
import { transparenciaInputSchema, transparenciaWorkflowSchema } from "../transparencias.schema.js";
import { TransparenciasRepository } from "../repositories/transparencias.repository.js";
import type { TransparenciaWorkflowStatus } from "../transparencias.types.js";

export class TransparenciasService {
  private readonly repository = new TransparenciasRepository();

  async listar(rawTenantId?: string) {
    const tenantId = this.parseTenant(rawTenantId);
    const registros = await this.repository.listar(tenantId);
    return registros.map((item) =>
      mapTransparenciaToResponse(
        item.transparencia,
        item.recebimentos,
        item.destinacoes,
        item.comprovantes,
        item.timelines,
        item.checklist,
        item.despesas,
        item.parecerHistorico
      )
    );
  }

  async obter(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist,
      registro.despesas,
      registro.parecerHistorico
    );
  }

  async criar(rawInput: unknown, rawTenantId?: string) {
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.criar(input, tenantId);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist,
      registro.despesas,
      registro.parecerHistorico
    );
  }

  async atualizar(rawId: string, rawInput: unknown, rawTenantId?: string, actor?: { id?: string; nomeUsuario?: string }) {
    const id = this.parseId(rawId);
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const tenantId = this.parseTenant(rawTenantId);
    const registro = await this.repository.atualizar(id, input, tenantId, actor?.id, actor?.nomeUsuario);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist,
      registro.despesas,
      registro.parecerHistorico
    );
  }

  async remover(rawId: string, rawTenantId?: string) {
    const id = this.parseId(rawId);
    const tenantId = this.parseTenant(rawTenantId);
    await this.repository.remover(id, tenantId);
  }

  async alterarWorkflow(rawId: string, rawInput: unknown, actor?: { id?: string; nomeUsuario?: string; tenant_id?: string }) {
    const input = transparenciaWorkflowSchema.parse(rawInput);
    const tenantId = this.parseTenant(actor?.tenant_id);
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id, tenantId);
    const atual = (registro.transparencia.status_workflow ?? "RASCUNHO") as TransparenciaWorkflowStatus;
    const transicoes: Record<string, TransparenciaWorkflowStatus[]> = {
      RASCUNHO: ["EM_ANALISE"],
      EM_ANALISE: ["EM_DILIGENCIA", "APROVADA", "APROVADA_RESSALVAS", "REJEITADA"],
      EM_DILIGENCIA: ["EM_ANALISE"],
      APROVADA: ["ENCERRADA"],
      APROVADA_RESSALVAS: ["ENCERRADA"],
      REJEITADA: ["RASCUNHO"],
      ENCERRADA: []
    };
    const destino = ({
      ENVIAR_ANALISE: "EM_ANALISE",
      DEVOLVER_DILIGENCIA: "EM_DILIGENCIA",
      APROVAR: "APROVADA",
      APROVAR_RESSALVAS: "APROVADA_RESSALVAS",
      REJEITAR: "REJEITADA",
      ENCERRAR: "ENCERRADA"
    }[input.acao] as TransparenciaWorkflowStatus);
    if (!transicoes[atual]?.includes(destino)) {
      throw new AppError(`Não é possível alterar a prestação de ${atual} para ${destino}.`, 409);
    }
    if (input.acao === "ENVIAR_ANALISE") {
      const erros: string[] = [];
      if (!registro.transparencia.periodo_inicio || !registro.transparencia.periodo_fim) erros.push("Informe o período da prestação.");
      if (!registro.transparencia.instrumento?.trim()) erros.push("Informe o instrumento ou parceria.");
      if (!registro.transparencia.objeto?.trim()) erros.push("Informe o objeto da parceria.");
      if (!registro.comprovantes.length) erros.push("Adicione ao menos um comprovante.");
      if (!registro.checklist.length || registro.checklist.some((item) => item.status !== "concluido")) erros.push("Conclua o checklist antes de enviar.");
      const totalDespesas = registro.despesas.reduce((total, item) => total + Number(item.valor ?? 0), 0);
      if ((registro.transparencia.total_aplicado ?? 0) > 0 && !registro.despesas.length) {
        erros.push("Detalhe as despesas e pagamentos realizados.");
      }
      if (registro.transparencia.total_aplicado != null && registro.despesas.length && Math.abs(totalDespesas - Number(registro.transparencia.total_aplicado)) > 0.01) {
        erros.push("A soma das despesas deve corresponder ao total aplicado.");
      }
      if (registro.transparencia.total_recebido != null && registro.transparencia.saldo_disponivel != null && registro.despesas.length) {
        const saldoConciliado = Number(registro.transparencia.total_recebido) - totalDespesas;
        if (Math.abs(saldoConciliado - Number(registro.transparencia.saldo_disponivel)) > 0.01) {
          erros.push("O saldo disponível não corresponde às receitas menos as despesas.");
        }
      }
      if (erros.length) throw new AppError(erros.join(" "), 422);
    }
    if (input.acao === "APROVAR" || input.acao === "APROVAR_RESSALVAS" || input.acao === "REJEITAR") {
      const erros: string[] = [];
      if (!registro.transparencia.parecer_texto?.trim()) erros.push("Registre o parecer técnico antes da decisão.");
      if (registro.transparencia.parecer_conclusao !== input.acao) erros.push("A conclusão do parecer deve corresponder à decisão selecionada.");
      if (input.acao === "APROVAR_RESSALVAS" && !registro.transparencia.parecer_ressalvas?.trim()) erros.push("Informe as ressalvas do parecer.");
      if (erros.length) throw new AppError(erros.join(" "), 422);
    }
    const atualizado = await this.repository.atualizarStatusWorkflow(id, destino, tenantId, actor?.id, actor?.nomeUsuario);
    return mapTransparenciaToResponse(atualizado.transparencia, atualizado.recebimentos, atualizado.destinacoes, atualizado.comprovantes, atualizado.timelines, atualizado.checklist, atualizado.despesas, atualizado.parecerHistorico);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
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
      mapaCamposTextoPrestacaoContas
    );
  }
}
