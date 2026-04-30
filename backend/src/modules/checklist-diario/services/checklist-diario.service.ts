import { AppError } from "../../../shared/errors/app-error.js";
import {
  mapChecklistConfiguracao,
  mapChecklistExecucao,
  mapChecklistHistorico,
  mapChecklistIndicadores,
  mapChecklistModelo
} from "../checklist-diario.mapper.js";
import {
  checklistConfiguracaoSchema,
  checklistExecucaoConclusaoSchema,
  checklistExecucaoDispensaSchema,
  checklistExecucaoReaberturaSchema,
  checklistGerarSemanaSchema,
  checklistListagemFiltrosSchema,
  checklistModeloSchema
} from "../checklist-diario.schema.js";
import type { ChecklistListagemFiltros, ChecklistUsuarioAtual } from "../checklist-diario.types.js";
import { ChecklistDiarioRepository } from "../repositories/checklist-diario.repository.js";

export class ChecklistDiarioService {
  private readonly repository = new ChecklistDiarioRepository();

  private requireTenant(usuario: ChecklistUsuarioAtual) {
    const tenantId = usuario.tenant_id?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
  }

  private hasPermission(usuario: ChecklistUsuarioAtual, permission: string) {
    return usuario.permissoes.includes("ADMINISTRADOR") || usuario.permissoes.includes(permission);
  }

  private buildScope(usuario: ChecklistUsuarioAtual, filtros: ChecklistListagemFiltros) {
    const visualizarTodos = this.hasPermission(
      usuario,
      "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
    );

    return {
      visualizarTodos,
      usuarioId: visualizarTodos ? filtros.usuarioId : Number(usuario.id)
    };
  }

  async listarExecucoes(rawFiltros: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const filtros = checklistListagemFiltrosSchema.parse(rawFiltros);
    const scope = this.buildScope(usuario, filtros);
    const execucoes = await this.repository.listarExecucoes(filtros, scope, tenantId, usuario);
    return execucoes.map(mapChecklistExecucao);
  }

  async listarSemana(rawFiltros: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const filtros = checklistListagemFiltrosSchema.parse(rawFiltros);
    const scope = this.buildScope(usuario, filtros);
    const execucoes = await this.repository.listarExecucoes(filtros, scope, tenantId, usuario);
    const agrupado = new Map<number, ReturnType<typeof mapChecklistExecucao>[]>();

    execucoes.forEach((item) => {
      const lista = agrupado.get(item.dia_semana) ?? [];
      lista.push(mapChecklistExecucao(item));
      agrupado.set(item.dia_semana, lista);
    });

    return Array.from(agrupado.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([diaSemana, itens]) => ({ diaSemana, itens }));
  }

  async obterIndicadores(rawFiltros: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (
      !this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_INDICADORES") &&
      !this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS")
    ) {
      throw new AppError("Sem permissão para visualizar indicadores do checklist.", 403);
    }

    const filtros = checklistListagemFiltrosSchema.parse(rawFiltros);
    const scope = this.buildScope(usuario, filtros);
    const indicadores = await this.repository.obterIndicadores(filtros, scope, tenantId, usuario);

    return {
      resumo: mapChecklistIndicadores(indicadores.resumo),
      cumprimentoPorUsuario: indicadores.cumprimentoPorUsuario.map((item) => ({
        usuarioId: Number(item.usuario_id),
        usuarioNome: item.usuario_nome,
        percentual: Number(item.percentual ?? 0),
        total: Number(item.total ?? 0),
        concluidas: Number(item.concluidas ?? 0)
      })),
      cumprimentoPorUnidade: indicadores.cumprimentoPorUnidade.map((item) => ({
        unidadeId: item.unidade_id ? Number(item.unidade_id) : undefined,
        unidadeNome: item.unidade_nome ?? "Sem unidade",
        percentual: Number(item.percentual ?? 0),
        total: Number(item.total ?? 0)
      })),
      cumprimentoPorSetor: indicadores.cumprimentoPorSetor.map((item) => ({
        setor: item.setor ?? "Sem setor",
        percentual: Number(item.percentual ?? 0),
        total: Number(item.total ?? 0)
      })),
      tarefasMaisAtrasadas: indicadores.tarefasMaisAtrasadas.map((item) => ({
        tituloAtividade: item.titulo_atividade,
        quantidade: Number(item.quantidade ?? 0)
      })),
      tarefasMaisRecorrentes: indicadores.tarefasMaisRecorrentes.map((item) => ({
        tituloAtividade: item.titulo_atividade,
        quantidade: Number(item.quantidade ?? 0)
      }))
    };
  }

  async listarHistorico(rawFiltros: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const filtros = rawFiltros as Record<string, unknown>;
    const historico = await this.repository.listarHistorico({
      execucaoId: typeof filtros.execucaoId === "string" && filtros.execucaoId.trim() ? Number(filtros.execucaoId) : undefined,
      usuarioId: typeof filtros.usuarioId === "string" && filtros.usuarioId.trim() ? Number(filtros.usuarioId) : undefined,
      limit: typeof filtros.limit === "string" && filtros.limit.trim() ? Number(filtros.limit) : undefined
    }, tenantId);

    const visualizarTodos = this.hasPermission(
      usuario,
      "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
    );

    if (!visualizarTodos) {
      return historico
        .filter((item) => !item.usuario_responsavel_id || Number(item.usuario_responsavel_id) === Number(usuario.id))
        .map(mapChecklistHistorico);
    }

    return historico.map(mapChecklistHistorico);
  }

  async obterExecucao(rawId: string, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const detalhe = await this.repository.obterExecucaoComHistorico(this.parseId(rawId), tenantId);
    const visualizarTodos = this.hasPermission(
      usuario,
      "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
    );
    if (!visualizarTodos && Number(detalhe.execucao.usuario_id) !== Number(usuario.id)) {
      throw new AppError("Sem permissão para acessar essa execução do checklist.", 403);
    }

    return {
      execucao: mapChecklistExecucao(detalhe.execucao),
      historico: detalhe.historico.map(mapChecklistHistorico)
    };
  }

  async concluir(rawId: string, rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CONCLUIR_ATIVIDADE")) {
      throw new AppError("Sem permissão para concluir atividades do checklist.", 403);
    }

    const input = checklistExecucaoConclusaoSchema.parse(rawInput);
    const detalheAtual = await this.repository.obterExecucaoComHistorico(this.parseId(rawId), tenantId);
    if (detalheAtual.execucao.observacao_obrigatoria && !input.observacao?.trim()) {
      throw new AppError("Esta atividade exige observação obrigatória para conclusão.", 422);
    }
    if (input.observacao?.trim() && !this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_INFORMAR_OBSERVACAO")) {
      throw new AppError("Sem permissão para registrar observações no checklist.", 403);
    }

    const visualizarTodos = this.hasPermission(
      usuario,
      "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS"
    );
    if (!visualizarTodos && Number(detalheAtual.execucao.usuario_id) !== Number(usuario.id)) {
      throw new AppError("Sem permissão para concluir atividade de outro usuário.", 403);
    }

    const atualizado = await this.repository.concluirExecucao(this.parseId(rawId), input, usuario, tenantId);
    return {
      execucao: mapChecklistExecucao(atualizado.execucao),
      historico: atualizado.historico.map(mapChecklistHistorico)
    };
  }

  async dispensar(rawId: string, rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE")) {
      throw new AppError("Sem permissão para dispensar atividade do checklist.", 403);
    }
    const atualizado = await this.repository.dispensarExecucao(
      this.parseId(rawId),
      checklistExecucaoDispensaSchema.parse(rawInput),
      usuario,
      "DISPENSADO",
      tenantId
    );
    return {
      execucao: mapChecklistExecucao(atualizado.execucao),
      historico: atualizado.historico.map(mapChecklistHistorico)
    };
  }

  async marcarNaoSeAplica(rawId: string, rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_DISPENSAR_ATIVIDADE")) {
      throw new AppError("Sem permissão para marcar atividade como não se aplica.", 403);
    }
    const atualizado = await this.repository.dispensarExecucao(
      this.parseId(rawId),
      checklistExecucaoDispensaSchema.parse(rawInput),
      usuario,
      "NAO_SE_APLICA",
      tenantId
    );
    return {
      execucao: mapChecklistExecucao(atualizado.execucao),
      historico: atualizado.historico.map(mapChecklistHistorico)
    };
  }

  async reabrir(rawId: string, rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_REABRIR_ATIVIDADE")) {
      throw new AppError("Sem permissão para reabrir atividade do checklist.", 403);
    }
    const atualizado = await this.repository.reabrirExecucao(
      this.parseId(rawId),
      checklistExecucaoReaberturaSchema.parse(rawInput),
      usuario,
      tenantId
    );
    return {
      execucao: mapChecklistExecucao(atualizado.execucao),
      historico: atualizado.historico.map(mapChecklistHistorico)
    };
  }

  async listarModelos(usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const { modelos, itens } = await this.repository.listarModelos(tenantId);
    return modelos.map((modelo) =>
      mapChecklistModelo(modelo, itens.filter((item) => item.modelo_id === modelo.id))
    );
  }

  async salvarModelo(rawId: string | undefined, rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    const permission = rawId
      ? "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO"
      : "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO";

    if (!this.hasPermission(usuario, permission)) {
      throw new AppError("Sem permissão para salvar modelo do checklist.", 403);
    }

    const modeloId = await this.repository.salvarModelo(
      rawId ? this.parseId(rawId) : null,
      checklistModeloSchema.parse(rawInput),
      usuario,
      tenantId
    );
    const modelos = await this.listarModelos(usuario);
    return modelos.find((item) => item.id === modeloId.toString());
  }

  async clonarModelo(rawId: string, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO")) {
      throw new AppError("Sem permissão para clonar modelo do checklist.", 403);
    }

    const modeloId = await this.repository.clonarModelo(this.parseId(rawId), usuario, tenantId);
    const modelos = await this.listarModelos(usuario);
    return modelos.find((item) => item.id === modeloId.toString());
  }

  async atualizarStatusModelo(rawId: string, ativo: boolean, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO")) {
      throw new AppError("Sem permissão para alterar status do modelo.", 403);
    }
    await this.repository.atualizarStatusModelo(this.parseId(rawId), ativo, usuario, tenantId);
  }

  async gerarSemana(rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO")) {
      throw new AppError("Sem permissão para gerar checklist semanal.", 403);
    }
    return this.repository.gerarChecklistDaSemana(checklistGerarSemanaSchema.parse(rawInput), tenantId, usuario);
  }

  async obterConfiguracao(usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    return mapChecklistConfiguracao(await this.repository.obterConfiguracao(tenantId));
  }

  async atualizarConfiguracao(rawInput: unknown, usuario: ChecklistUsuarioAtual) {
    const tenantId = this.requireTenant(usuario);
    if (!this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_GERENCIAR_CONFIGURACOES")) {
      throw new AppError("Sem permissão para gerenciar configurações do checklist.", 403);
    }

    const input = checklistConfiguracaoSchema.parse(rawInput);
    if (input.sabadoAtivo && !this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_SABADO")) {
      throw new AppError("Sem permissão para ativar sábado.", 403);
    }
    if (input.domingoAtivo && !this.hasPermission(usuario, "SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_ATIVAR_DOMINGO")) {
      throw new AppError("Sem permissão para ativar domingo.", 403);
    }

    return mapChecklistConfiguracao(await this.repository.atualizarConfiguracao(input, usuario, tenantId));
  }

  private parseId(rawId: string) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(id);
  }
}
