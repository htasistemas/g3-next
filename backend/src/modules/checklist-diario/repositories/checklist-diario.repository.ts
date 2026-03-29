import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  ChecklistConfiguracaoInput,
  ChecklistConfiguracaoRow,
  ChecklistExecucaoConclusaoInput,
  ChecklistExecucaoDispensaInput,
  ChecklistExecucaoReaberturaInput,
  ChecklistExecucaoRow,
  ChecklistGerarSemanaInput,
  ChecklistHistoricoRow,
  ChecklistIndicadoresRow,
  ChecklistListagemFiltros,
  ChecklistModeloInput,
  ChecklistModeloItemRow,
  ChecklistModeloRow,
  ChecklistUsuarioAtual,
  ChecklistUsuarioContexto
} from "../checklist-diario.types.js";
import { ensureChecklistDiarioEstrutura } from "./checklist-diario-estrutura.repository.js";

type TransactionClient = Prisma.TransactionClient;

type ChecklistScope = {
  visualizarTodos: boolean;
  usuarioId?: number;
};

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizeTimeValue(value?: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }
  const texto = String(value).trim();
  return texto ? texto.slice(0, 5) : null;
}

function buildGenerationKey(modeloItemId: bigint, usuarioId: bigint, referenciaData: Date) {
  return `${modeloItemId.toString()}:${usuarioId.toString()}:${referenciaData.toISOString().slice(0, 10)}`;
}

function normalizeDateRange(periodoInicio?: string, periodoFim?: string) {
  const start = toOptionalDate(periodoInicio) ?? startOfWeek(new Date());
  const end = toOptionalDate(periodoFim) ?? addDays(startOfWeek(start), 6);
  return { start, end };
}

export class ChecklistDiarioRepository {
  private async ensureEstrutura() {
    await ensureChecklistDiarioEstrutura(prisma);
  }

  private async registrarHistorico(
    tx: TransactionClient,
    input: {
      referenciaTipo: "EXECUCAO" | "MODELO" | "CONFIGURACAO";
      execucaoId?: bigint | null;
      modeloId?: bigint | null;
      modeloItemId?: bigint | null;
      configuracaoId?: bigint | null;
      acao: string;
      statusAnterior?: string | null;
      statusNovo?: string | null;
      usuarioResponsavelId?: bigint | null;
      observacao?: string | null;
      motivo?: string | null;
      origem?: string | null;
      dados?: Record<string, unknown>;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO checklist_execucao_historico (
        referencia_tipo,
        execucao_id,
        modelo_id,
        modelo_item_id,
        configuracao_id,
        acao,
        status_anterior,
        status_novo,
        usuario_responsavel_id,
        observacao,
        motivo,
        origem,
        dados_json,
        criado_em
      ) VALUES (
        ${input.referenciaTipo},
        ${input.execucaoId ?? null},
        ${input.modeloId ?? null},
        ${input.modeloItemId ?? null},
        ${input.configuracaoId ?? null},
        ${input.acao},
        ${input.statusAnterior ?? null},
        ${input.statusNovo ?? null},
        ${input.usuarioResponsavelId ?? null},
        ${input.observacao ?? null},
        ${input.motivo ?? null},
        ${input.origem ?? null},
        ${JSON.stringify(input.dados ?? {})}::jsonb,
        NOW()
      )
    `);
  }

  async obterConfiguracao() {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<ChecklistConfiguracaoRow[]>(Prisma.sql`
      SELECT id, sabado_ativo, domingo_ativo, criado_em, atualizado_em
      FROM checklist_configuracoes
      WHERE id = 1
      LIMIT 1
    `);
    const config = rows[0];
    if (!config) {
      throw new AppError("Configuração do checklist não encontrada.", 500);
    }
    return config;
  }

  async buscarUsuarioContexto(usuarioId: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<ChecklistUsuarioContexto[]>(Prisma.sql`
      SELECT
        u.id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS nome,
        NULLIF(TRIM(u.setor), '') AS setor,
        NULLIF(TRIM(u.cargo), '') AS cargo,
        NULLIF(TRIM(u.unidade), '') AS "unidadeNome",
        ua.id AS "unidadeId"
      FROM usuarios u
      LEFT JOIN unidade_assistencial ua
        ON LOWER(TRIM(ua.nome_fantasia)) = LOWER(TRIM(u.unidade))
      WHERE u.id = ${usuarioId}
      LIMIT 1
    `);

    const usuario = rows[0];
    if (!usuario) {
      throw new AppError("Usuário do checklist não encontrado.", 404);
    }
    return usuario;
  }

  private async listarUsuariosElegiveis(tx: TransactionClient, filtroUsuarioId?: bigint) {
    return tx.$queryRaw<ChecklistUsuarioContexto[]>(Prisma.sql`
      SELECT
        u.id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS nome,
        NULLIF(TRIM(u.setor), '') AS setor,
        NULLIF(TRIM(u.cargo), '') AS cargo,
        NULLIF(TRIM(u.unidade), '') AS "unidadeNome",
        ua.id AS "unidadeId"
      FROM usuarios u
      LEFT JOIN unidade_assistencial ua
        ON LOWER(TRIM(ua.nome_fantasia)) = LOWER(TRIM(u.unidade))
      WHERE COALESCE(NULLIF(TRIM(u.status), ''), 'ATIVO') = 'ATIVO'
        ${filtroUsuarioId ? Prisma.sql`AND u.id = ${filtroUsuarioId}` : Prisma.empty}
      ORDER BY 2
    `);
  }

  private async listarModelosAplicaveis(tx: TransactionClient, usuario: ChecklistUsuarioContexto) {
    return tx.$queryRaw<(ChecklistModeloRow & ChecklistModeloItemRow)[]>(Prisma.sql`
      SELECT
        m.id,
        m.codigo,
        m.nome,
        m.descricao,
        m.tipo,
        m.usuario_id,
        m.unidade_id,
        ua.nome_fantasia AS unidade_nome,
        m.setor,
        m.cargo,
        m.ativo,
        m.criado_em,
        m.atualizado_em,
        i.id,
        i.modelo_id,
        i.dia_semana,
        i.titulo,
        i.descricao_detalhada,
        i.horario_previsto,
        i.prioridade,
        i.alerta_ativo,
        i.horario_alerta,
        i.observacao_obrigatoria,
        i.atividade_critica,
        i.ordem,
        i.ativo,
        i.criado_em,
        i.atualizado_em
      FROM checklist_modelos m
      INNER JOIN checklist_modelo_itens i ON i.modelo_id = m.id
      LEFT JOIN unidade_assistencial ua ON ua.id = m.unidade_id
      WHERE m.ativo = TRUE
        AND i.ativo = TRUE
        AND (
          m.tipo = 'INSTITUCIONAL'
          OR (m.tipo = 'SETOR' AND COALESCE(m.setor, '') = COALESCE(CAST(${usuario.setor ?? null} AS TEXT), ''))
          OR (m.tipo = 'FUNCAO' AND COALESCE(m.cargo, '') = COALESCE(CAST(${usuario.cargo ?? null} AS TEXT), ''))
          OR (m.tipo = 'USUARIO' AND m.usuario_id = ${usuario.id})
        )
        AND (
          m.unidade_id IS NULL
          OR (CAST(${usuario.unidadeId ?? null} AS BIGINT) IS NOT NULL AND m.unidade_id = CAST(${usuario.unidadeId ?? null} AS BIGINT))
        )
      ORDER BY m.nome ASC, i.dia_semana ASC, i.ordem ASC, i.id ASC
    `);
  }

  async atualizarStatusAutomatico() {
    await this.ensureEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE checklist_execucoes
      SET
        status = 'ATRASADO',
        atualizado_em = NOW()
      WHERE status = 'PENDENTE'
        AND concluido_em IS NULL
        AND dispensado_em IS NULL
        AND ativo = TRUE
        AND horario_previsto IS NOT NULL
        AND (referencia_data + horario_previsto) < NOW()
    `);
  }

  async gerarChecklistDaSemana(input: ChecklistGerarSemanaInput, usuarioAtual?: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();
    const dataBase = toOptionalDate(input.dataReferencia) ?? new Date();
    const semanaInicio = startOfWeek(dataBase);
    const configuracao = await this.obterConfiguracao();

    return prisma.$transaction(async (tx) => {
      const usuarios = await this.listarUsuariosElegiveis(
        tx,
        input.usuarioId ? BigInt(input.usuarioId) : undefined
      );
      let geradas = 0;

      for (const usuario of usuarios) {
        const modelos = await this.listarModelosAplicaveis(tx, usuario);

        for (const item of modelos) {
          const diaSemana = Number(item.dia_semana);
          if (diaSemana === 6 && !configuracao.sabado_ativo) continue;
          if (diaSemana === 7 && !configuracao.domingo_ativo) continue;

          const referenciaData = addDays(semanaInicio, diaSemana - 1);
          const chave = buildGenerationKey(item.id, usuario.id, referenciaData);

          const existente = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
            SELECT id
            FROM checklist_execucoes
            WHERE chave_geracao = ${chave}
            LIMIT 1
          `);

          if (existente[0] && !input.forcar) {
            continue;
          }

          if (existente[0] && input.forcar) {
            await tx.$executeRaw(Prisma.sql`
              UPDATE checklist_execucoes
              SET
                titulo_atividade = ${item.titulo},
                descricao_detalhada = ${item.descricao_detalhada},
                horario_previsto = CAST(${normalizeTimeValue(item.horario_previsto)} AS TIME),
                prioridade = ${item.prioridade},
                alerta_ativo = ${item.alerta_ativo},
                horario_alerta = CAST(${normalizeTimeValue(item.horario_alerta)} AS TIME),
                observacao_obrigatoria = ${item.observacao_obrigatoria},
                atividade_critica = ${item.atividade_critica},
                atualizado_em = NOW()
              WHERE id = ${existente[0].id}
                AND status = 'PENDENTE'
            `);

            await this.registrarHistorico(tx, {
              referenciaTipo: "EXECUCAO",
              execucaoId: existente[0].id,
              modeloId: item.modelo_id,
              modeloItemId: item.id,
              usuarioResponsavelId: usuarioAtual ? BigInt(usuarioAtual.id) : null,
              acao: "REGENERACAO_CONTROLADA",
              statusAnterior: "PENDENTE",
              statusNovo: "PENDENTE",
              origem: input.forcar ? "MANUAL" : "AUTOMATICA",
              dados: {
                usuarioId: usuario.id.toString(),
                referenciaData: referenciaData.toISOString().slice(0, 10)
              }
            });
            geradas += 1;
            continue;
          }

          const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
            INSERT INTO checklist_execucoes (
              modelo_id,
              modelo_item_id,
              usuario_id,
              unidade_id,
              setor,
              cargo,
              referencia_data,
              semana_inicio,
              dia_semana,
              titulo_atividade,
              descricao_detalhada,
              horario_previsto,
              prioridade,
              alerta_ativo,
              horario_alerta,
              observacao_obrigatoria,
              atividade_critica,
              status,
              ativo,
              gerado_automaticamente,
              origem,
              chave_geracao,
              criado_em,
              atualizado_em
            ) VALUES (
              ${item.modelo_id},
              ${item.id},
              ${usuario.id},
              ${usuario.unidadeId ?? null},
              ${usuario.setor ?? null},
              ${usuario.cargo ?? null},
              ${referenciaData},
              ${semanaInicio},
              ${diaSemana},
              ${item.titulo},
              ${item.descricao_detalhada},
              CAST(${normalizeTimeValue(item.horario_previsto)} AS TIME),
              ${item.prioridade},
              ${item.alerta_ativo},
              CAST(${normalizeTimeValue(item.horario_alerta)} AS TIME),
              ${item.observacao_obrigatoria},
              ${item.atividade_critica},
              'PENDENTE',
              TRUE,
              TRUE,
              ${input.forcar ? "MANUAL" : "AUTOMATICA"},
              ${chave},
              NOW(),
              NOW()
            )
            RETURNING id
          `);

          if (inserted[0]?.id) {
            await this.registrarHistorico(tx, {
              referenciaTipo: "EXECUCAO",
              execucaoId: inserted[0].id,
              modeloId: item.modelo_id,
              modeloItemId: item.id,
              usuarioResponsavelId: usuarioAtual ? BigInt(usuarioAtual.id) : null,
              acao: "GERACAO_AUTOMATICA",
              statusNovo: "PENDENTE",
              origem: input.forcar ? "MANUAL" : "AUTOMATICA",
              dados: {
                usuarioId: usuario.id.toString(),
                referenciaData: referenciaData.toISOString().slice(0, 10)
              }
            });
            geradas += 1;
          }
        }
      }

      return {
        semanaInicio: semanaInicio.toISOString().slice(0, 10),
        totalGerado: geradas
      };
    });
  }

  private async garantirSemanaAtualGerada(
    filtros: ChecklistListagemFiltros,
    scope: ChecklistScope,
    usuarioAtual?: ChecklistUsuarioAtual
  ) {
    const { start, end } = normalizeDateRange(filtros.periodoInicio, filtros.periodoFim);
    const semanaAtualInicio = startOfWeek(new Date());
    const semanaAtualFim = addDays(semanaAtualInicio, 6);
    if (end < semanaAtualInicio || start > semanaAtualFim) {
      return;
    }

    await this.gerarChecklistDaSemana(
      {
        dataReferencia: semanaAtualInicio.toISOString().slice(0, 10),
        usuarioId: scope.visualizarTodos ? filtros.usuarioId : scope.usuarioId
      },
      usuarioAtual
    );
  }

  private buildScopeFilter(filtros: ChecklistListagemFiltros, scope: ChecklistScope) {
    const usuarioId = scope.visualizarTodos ? filtros.usuarioId : scope.usuarioId;
    return usuarioId ? Prisma.sql`AND e.usuario_id = ${BigInt(usuarioId)}` : Prisma.empty;
  }

  private buildWhereFilters(filtros: ChecklistListagemFiltros, scope: ChecklistScope) {
    const { start, end } = normalizeDateRange(filtros.periodoInicio, filtros.periodoFim);
    const termo = trimOrUndefined(filtros.termo);

    return Prisma.sql`
      WHERE e.ativo = TRUE
        AND e.referencia_data BETWEEN ${start} AND ${end}
        ${this.buildScopeFilter(filtros, scope)}
        ${filtros.unidadeId ? Prisma.sql`AND e.unidade_id = ${BigInt(filtros.unidadeId)}` : Prisma.empty}
        ${filtros.status ? Prisma.sql`AND e.status = ${filtros.status}` : Prisma.empty}
        ${filtros.prioridade ? Prisma.sql`AND e.prioridade = ${filtros.prioridade}` : Prisma.empty}
        ${filtros.diaSemana ? Prisma.sql`AND e.dia_semana = ${filtros.diaSemana}` : Prisma.empty}
        ${filtros.tipoModelo ? Prisma.sql`AND m.tipo = ${filtros.tipoModelo}` : Prisma.empty}
        ${filtros.somentePendentes ? Prisma.sql`AND e.status = 'PENDENTE'` : Prisma.empty}
        ${filtros.somenteAtrasados ? Prisma.sql`AND e.status = 'ATRASADO'` : Prisma.empty}
        ${
          termo
            ? Prisma.sql`
              AND (
                LOWER(e.titulo_atividade) LIKE ${`%${termo.toLowerCase()}%`}
                OR LOWER(COALESCE(e.descricao_detalhada, '')) LIKE ${`%${termo.toLowerCase()}%`}
                OR LOWER(COALESCE(u.nome, u.nome_usuario, '')) LIKE ${`%${termo.toLowerCase()}%`}
                OR LOWER(COALESCE(ua.nome_fantasia, '')) LIKE ${`%${termo.toLowerCase()}%`}
              )
            `
            : Prisma.empty
        }
    `;
  }

  async listarExecucoes(
    filtros: ChecklistListagemFiltros,
    scope: ChecklistScope,
    usuarioAtual?: ChecklistUsuarioAtual
  ) {
    await this.atualizarStatusAutomatico();
    await this.garantirSemanaAtualGerada(filtros, scope, usuarioAtual);

    return prisma.$queryRaw<ChecklistExecucaoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.modelo_id,
        e.modelo_item_id,
        e.usuario_id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS usuario_nome,
        e.unidade_id,
        ua.nome_fantasia AS unidade_nome,
        e.setor,
        e.cargo,
        e.referencia_data,
        e.semana_inicio,
        e.dia_semana,
        e.titulo_atividade,
        e.descricao_detalhada,
        e.horario_previsto,
        e.prioridade,
        e.alerta_ativo,
        e.horario_alerta,
        e.observacao_obrigatoria,
        e.atividade_critica,
        e.status,
        e.observacao_usuario,
        e.concluido_em,
        e.concluido_por_usuario_id,
        COALESCE(NULLIF(TRIM(uc.nome_exibicao), ''), NULLIF(TRIM(uc.nome), ''), uc.nome_usuario) AS concluido_por_nome,
        e.dispensado_em,
        e.dispensado_por_usuario_id,
        COALESCE(NULLIF(TRIM(ud.nome_exibicao), ''), NULLIF(TRIM(ud.nome), ''), ud.nome_usuario) AS dispensado_por_nome,
        e.motivo_dispensa,
        e.nao_aplicavel_motivo,
        e.ativo,
        e.gerado_automaticamente,
        e.origem,
        e.criado_em,
        e.atualizado_em,
        m.nome AS modelo_nome,
        m.tipo AS modelo_tipo
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN usuarios uc ON uc.id = e.concluido_por_usuario_id
      LEFT JOIN usuarios ud ON ud.id = e.dispensado_por_usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters(filtros, scope)}
      ORDER BY e.referencia_data ASC, e.horario_previsto ASC NULLS LAST, e.id ASC
    `);
  }

  async obterIndicadores(
    filtros: ChecklistListagemFiltros,
    scope: ChecklistScope,
    usuarioAtual?: ChecklistUsuarioAtual
  ) {
    await this.atualizarStatusAutomatico();
    await this.garantirSemanaAtualGerada(filtros, scope, usuarioAtual);

    const resumo = await prisma.$queryRaw<ChecklistIndicadoresRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE e.status = 'CONCLUIDO')::BIGINT AS concluidas,
        COUNT(*) FILTER (WHERE e.status = 'PENDENTE')::BIGINT AS pendentes,
        COUNT(*) FILTER (WHERE e.status = 'ATRASADO')::BIGINT AS atrasadas,
        COUNT(*) FILTER (WHERE e.status = 'DISPENSADO')::BIGINT AS dispensadas,
        COUNT(*) FILTER (WHERE e.status = 'NAO_SE_APLICA')::BIGINT AS nao_aplicaveis,
        COUNT(*) FILTER (WHERE e.atividade_critica = TRUE AND e.status IN ('PENDENTE', 'ATRASADO'))::BIGINT AS criticas_nao_concluidas
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters(filtros, scope)}
    `);

    const cumprimentoPorUsuario = await prisma.$queryRaw<
      Array<{ usuario_id: bigint; usuario_nome: string; percentual: number; total: bigint | number; concluidas: bigint | number }>
    >(Prisma.sql`
      SELECT
        e.usuario_id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS usuario_nome,
        ROUND(((COUNT(*) FILTER (WHERE e.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100), 0) AS percentual,
        COUNT(*)::BIGINT AS total,
        COUNT(*) FILTER (WHERE e.status = 'CONCLUIDO')::BIGINT AS concluidas
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters(filtros, scope)}
      GROUP BY e.usuario_id, usuario_nome
      ORDER BY percentual DESC NULLS LAST, usuario_nome ASC
      LIMIT 10
    `);

    const cumprimentoPorUnidade = await prisma.$queryRaw<
      Array<{ unidade_id: bigint | null; unidade_nome: string | null; percentual: number; total: bigint | number }>
    >(Prisma.sql`
      SELECT
        e.unidade_id,
        ua.nome_fantasia AS unidade_nome,
        ROUND(((COUNT(*) FILTER (WHERE e.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100), 0) AS percentual,
        COUNT(*)::BIGINT AS total
      FROM checklist_execucoes e
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters(filtros, scope)}
      GROUP BY e.unidade_id, ua.nome_fantasia
      ORDER BY percentual DESC NULLS LAST, unidade_nome ASC NULLS LAST
      LIMIT 10
    `);

    const cumprimentoPorSetor = await prisma.$queryRaw<
      Array<{ setor: string | null; percentual: number; total: bigint | number }>
    >(Prisma.sql`
      SELECT
        e.setor,
        ROUND(((COUNT(*) FILTER (WHERE e.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100), 0) AS percentual,
        COUNT(*)::BIGINT AS total
      FROM checklist_execucoes e
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters(filtros, scope)}
      GROUP BY e.setor
      ORDER BY percentual DESC NULLS LAST, e.setor ASC NULLS LAST
      LIMIT 10
    `);

    const tarefasMaisAtrasadas = await prisma.$queryRaw<
      Array<{ titulo_atividade: string; quantidade: bigint | number }>
    >(Prisma.sql`
      SELECT e.titulo_atividade, COUNT(*)::BIGINT AS quantidade
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters({ ...filtros, status: undefined, somentePendentes: undefined, somenteAtrasados: undefined }, scope)}
        AND e.status = 'ATRASADO'
      GROUP BY e.titulo_atividade
      ORDER BY quantidade DESC, e.titulo_atividade ASC
      LIMIT 10
    `);

    const tarefasMaisRecorrentes = await prisma.$queryRaw<
      Array<{ titulo_atividade: string; quantidade: bigint | number }>
    >(Prisma.sql`
      SELECT e.titulo_atividade, COUNT(*)::BIGINT AS quantidade
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      ${this.buildWhereFilters({ ...filtros, status: undefined, somentePendentes: undefined, somenteAtrasados: undefined }, scope)}
      GROUP BY e.titulo_atividade
      ORDER BY quantidade DESC, e.titulo_atividade ASC
      LIMIT 10
    `);

    return {
      resumo: resumo[0],
      cumprimentoPorUsuario,
      cumprimentoPorUnidade,
      cumprimentoPorSetor,
      tarefasMaisAtrasadas,
      tarefasMaisRecorrentes
    };
  }

  async listarHistorico(filtros: { execucaoId?: number; usuarioId?: number; limit?: number }) {
    await this.ensureEstrutura();
    const limit = filtros.limit && filtros.limit > 0 ? Math.min(filtros.limit, 200) : 100;
    return prisma.$queryRaw<ChecklistHistoricoRow[]>(Prisma.sql`
      SELECT
        h.id,
        h.referencia_tipo,
        h.execucao_id,
        h.modelo_id,
        h.modelo_item_id,
        h.configuracao_id,
        h.acao,
        h.status_anterior,
        h.status_novo,
        h.usuario_responsavel_id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS usuario_responsavel_nome,
        h.observacao,
        h.motivo,
        h.origem,
        h.dados_json,
        h.criado_em
      FROM checklist_execucao_historico h
      LEFT JOIN usuarios u ON u.id = h.usuario_responsavel_id
      WHERE 1 = 1
        ${filtros.execucaoId ? Prisma.sql`AND h.execucao_id = ${BigInt(filtros.execucaoId)}` : Prisma.empty}
        ${filtros.usuarioId ? Prisma.sql`AND h.usuario_responsavel_id = ${BigInt(filtros.usuarioId)}` : Prisma.empty}
      ORDER BY h.criado_em DESC, h.id DESC
      LIMIT ${limit}
    `);
  }

  async listarModelos() {
    await this.ensureEstrutura();
    const modelos = await prisma.$queryRaw<ChecklistModeloRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.codigo,
        m.nome,
        m.descricao,
        m.tipo,
        m.usuario_id,
        m.unidade_id,
        ua.nome_fantasia AS unidade_nome,
        m.setor,
        m.cargo,
        m.ativo,
        m.criado_em,
        m.atualizado_em
      FROM checklist_modelos m
      LEFT JOIN unidade_assistencial ua ON ua.id = m.unidade_id
      ORDER BY m.ativo DESC, m.nome ASC
    `);

    const itens = await prisma.$queryRaw<ChecklistModeloItemRow[]>(Prisma.sql`
      SELECT
        id,
        modelo_id,
        dia_semana,
        titulo,
        descricao_detalhada,
        horario_previsto,
        prioridade,
        alerta_ativo,
        horario_alerta,
        observacao_obrigatoria,
        atividade_critica,
        ordem,
        ativo,
        criado_em,
        atualizado_em
      FROM checklist_modelo_itens
      ORDER BY modelo_id ASC, dia_semana ASC, ordem ASC, id ASC
    `);

    return { modelos, itens };
  }

  async salvarModelo(modeloId: bigint | null, input: ChecklistModeloInput, usuarioAtual: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();

    return prisma.$transaction(async (tx) => {
      let id = modeloId;

      if (id) {
        const atual = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          SELECT id
          FROM checklist_modelos
          WHERE id = ${id}
          LIMIT 1
        `);
        if (!atual[0]) {
          throw new AppError("Modelo de checklist não encontrado.", 404);
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE checklist_modelos
          SET
            nome = ${input.nome},
            descricao = ${trimOrUndefined(input.descricao) ?? null},
            tipo = ${input.tipo},
            usuario_id = ${input.usuarioId ? BigInt(input.usuarioId) : null},
            unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null},
            setor = ${trimOrUndefined(input.setor) ?? null},
            cargo = ${trimOrUndefined(input.cargo) ?? null},
            ativo = ${input.ativo ?? true},
            atualizado_por_usuario_id = ${BigInt(usuarioAtual.id)},
            atualizado_em = NOW()
          WHERE id = ${id}
        `);

        await tx.$executeRaw(Prisma.sql`
          DELETE FROM checklist_modelo_itens
          WHERE modelo_id = ${id}
        `);
      } else {
        const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          INSERT INTO checklist_modelos (
            nome,
            descricao,
            tipo,
            usuario_id,
            unidade_id,
            setor,
            cargo,
            ativo,
            criado_por_usuario_id,
            atualizado_por_usuario_id,
            criado_em,
            atualizado_em
          ) VALUES (
            ${input.nome},
            ${trimOrUndefined(input.descricao) ?? null},
            ${input.tipo},
            ${input.usuarioId ? BigInt(input.usuarioId) : null},
            ${input.unidadeId ? BigInt(input.unidadeId) : null},
            ${trimOrUndefined(input.setor) ?? null},
            ${trimOrUndefined(input.cargo) ?? null},
            ${input.ativo ?? true},
            ${BigInt(usuarioAtual.id)},
            ${BigInt(usuarioAtual.id)},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        id = inserted[0]?.id ?? null;
      }

      if (!id) {
        throw new AppError("Não foi possível salvar o modelo do checklist.", 500);
      }

      for (const [index, item] of input.itens.entries()) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO checklist_modelo_itens (
            modelo_id,
            dia_semana,
            titulo,
            descricao_detalhada,
            horario_previsto,
            prioridade,
            alerta_ativo,
            horario_alerta,
            observacao_obrigatoria,
            atividade_critica,
            ordem,
            ativo,
            criado_em,
            atualizado_em
          ) VALUES (
            ${id},
            ${item.diaSemana},
            ${item.titulo},
            ${trimOrUndefined(item.descricaoDetalhada) ?? null},
            CAST(${trimOrUndefined(item.horarioPrevisto ?? undefined) ?? null} AS TIME),
            ${item.prioridade},
            ${!!item.alertaAtivo},
            CAST(${trimOrUndefined(item.horarioAlerta ?? undefined) ?? null} AS TIME),
            ${!!item.observacaoObrigatoria},
            ${!!item.atividadeCritica},
            ${item.ordem ?? index},
            ${item.ativo ?? true},
            NOW(),
            NOW()
          )
        `);
      }

      await this.registrarHistorico(tx, {
        referenciaTipo: "MODELO",
        modeloId: id,
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: modeloId ? "EDICAO_MODELO" : "CRIACAO_MODELO",
        statusNovo: input.ativo ?? true ? "ATIVO" : "INATIVO",
        origem: "MANUAL",
        dados: { nome: input.nome, tipo: input.tipo, itens: input.itens.length }
      });

      return id;
    });
  }

  async clonarModelo(id: bigint, usuarioAtual: ChecklistUsuarioAtual) {
    const { modelos, itens } = await this.listarModelos();
    const modelo = modelos.find((item) => item.id === id);
    if (!modelo) {
      throw new AppError("Modelo do checklist não encontrado.", 404);
    }

    const itensModelo = itens.filter((item) => item.modelo_id === id);
    return this.salvarModelo(
      null,
      {
        nome: `${modelo.nome} - cópia`,
        descricao: modelo.descricao ?? undefined,
        tipo: modelo.tipo,
        usuarioId: modelo.usuario_id ? Number(modelo.usuario_id) : null,
        unidadeId: modelo.unidade_id ? Number(modelo.unidade_id) : null,
        setor: modelo.setor ?? undefined,
        cargo: modelo.cargo ?? undefined,
        ativo: false,
        itens: itensModelo.map((item) => ({
          diaSemana: item.dia_semana,
          titulo: item.titulo,
          descricaoDetalhada: item.descricao_detalhada ?? undefined,
          horarioPrevisto: normalizeTimeValue(item.horario_previsto),
          prioridade: item.prioridade,
          alertaAtivo: item.alerta_ativo,
          horarioAlerta: normalizeTimeValue(item.horario_alerta),
          observacaoObrigatoria: item.observacao_obrigatoria,
          atividadeCritica: item.atividade_critica,
          ordem: item.ordem,
          ativo: item.ativo
        }))
      },
      usuarioAtual
    );
  }

  async atualizarStatusModelo(id: bigint, ativo: boolean, usuarioAtual: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();
    const updated = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      UPDATE checklist_modelos
      SET
        ativo = ${ativo},
        atualizado_por_usuario_id = ${BigInt(usuarioAtual.id)},
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING id
    `);

    if (!updated[0]) {
      throw new AppError("Modelo do checklist não encontrado.", 404);
    }

    await prisma.$transaction(async (tx) => {
      await this.registrarHistorico(tx, {
        referenciaTipo: "MODELO",
        modeloId: id,
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: ativo ? "ATIVACAO_MODELO" : "INATIVACAO_MODELO",
        statusNovo: ativo ? "ATIVO" : "INATIVO",
        origem: "MANUAL"
      });
    });
  }

  private async buscarExecucaoPorId(tx: TransactionClient, id: bigint) {
    const rows = await tx.$queryRaw<ChecklistExecucaoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.modelo_id,
        e.modelo_item_id,
        e.usuario_id,
        COALESCE(NULLIF(TRIM(u.nome_exibicao), ''), NULLIF(TRIM(u.nome), ''), u.nome_usuario) AS usuario_nome,
        e.unidade_id,
        ua.nome_fantasia AS unidade_nome,
        e.setor,
        e.cargo,
        e.referencia_data,
        e.semana_inicio,
        e.dia_semana,
        e.titulo_atividade,
        e.descricao_detalhada,
        e.horario_previsto,
        e.prioridade,
        e.alerta_ativo,
        e.horario_alerta,
        e.observacao_obrigatoria,
        e.atividade_critica,
        e.status,
        e.observacao_usuario,
        e.concluido_em,
        e.concluido_por_usuario_id,
        COALESCE(NULLIF(TRIM(uc.nome_exibicao), ''), NULLIF(TRIM(uc.nome), ''), uc.nome_usuario) AS concluido_por_nome,
        e.dispensado_em,
        e.dispensado_por_usuario_id,
        COALESCE(NULLIF(TRIM(ud.nome_exibicao), ''), NULLIF(TRIM(ud.nome), ''), ud.nome_usuario) AS dispensado_por_nome,
        e.motivo_dispensa,
        e.nao_aplicavel_motivo,
        e.ativo,
        e.gerado_automaticamente,
        e.origem,
        e.criado_em,
        e.atualizado_em,
        m.nome AS modelo_nome,
        m.tipo AS modelo_tipo
      FROM checklist_execucoes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN usuarios uc ON uc.id = e.concluido_por_usuario_id
      LEFT JOIN usuarios ud ON ud.id = e.dispensado_por_usuario_id
      LEFT JOIN unidade_assistencial ua ON ua.id = e.unidade_id
      LEFT JOIN checklist_modelos m ON m.id = e.modelo_id
      WHERE e.id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async obterExecucaoComHistorico(id: bigint) {
    await this.ensureEstrutura();
    return prisma.$transaction(async (tx) => {
      const execucao = await this.buscarExecucaoPorId(tx, id);
      if (!execucao) {
        throw new AppError("Execução do checklist não encontrada.", 404);
      }

      const historico = await this.listarHistorico({ execucaoId: Number(id), limit: 50 });
      return { execucao, historico };
    });
  }

  async concluirExecucao(id: bigint, input: ChecklistExecucaoConclusaoInput, usuarioAtual: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();
    return prisma.$transaction(async (tx) => {
      const execucao = await this.buscarExecucaoPorId(tx, id);
      if (!execucao) {
        throw new AppError("Execução do checklist não encontrada.", 404);
      }

      if (execucao.status === "DISPENSADO" || execucao.status === "NAO_SE_APLICA") {
        throw new AppError("Essa atividade não pode ser concluída no status atual.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE checklist_execucoes
        SET
          status = 'CONCLUIDO',
          observacao_usuario = ${trimOrUndefined(input.observacao) ?? execucao.observacao_usuario},
          concluido_em = NOW(),
          concluido_por_usuario_id = ${BigInt(usuarioAtual.id)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await this.registrarHistorico(tx, {
        referenciaTipo: "EXECUCAO",
        execucaoId: id,
        modeloId: execucao.modelo_id,
        modeloItemId: execucao.modelo_item_id,
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: "CONCLUSAO",
        statusAnterior: execucao.status,
        statusNovo: "CONCLUIDO",
        observacao: trimOrUndefined(input.observacao) ?? null,
        origem: "INTERFACE"
      });

      const atualizada = await this.buscarExecucaoPorId(tx, id);
      if (!atualizada) {
        throw new AppError("Falha ao concluir execução do checklist.", 500);
      }

      return {
        execucao: atualizada,
        historico: await this.listarHistorico({ execucaoId: Number(id), limit: 50 })
      };
    });
  }

  async dispensarExecucao(
    id: bigint,
    input: ChecklistExecucaoDispensaInput,
    usuarioAtual: ChecklistUsuarioAtual,
    statusNovo: "DISPENSADO" | "NAO_SE_APLICA"
  ) {
    await this.ensureEstrutura();
    return prisma.$transaction(async (tx) => {
      const execucao = await this.buscarExecucaoPorId(tx, id);
      if (!execucao) {
        throw new AppError("Execução do checklist não encontrada.", 404);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE checklist_execucoes
        SET
          status = ${statusNovo},
          observacao_usuario = ${trimOrUndefined(input.observacao) ?? execucao.observacao_usuario},
          dispensado_em = NOW(),
          dispensado_por_usuario_id = ${BigInt(usuarioAtual.id)},
          motivo_dispensa = ${statusNovo === "DISPENSADO" ? input.motivo : execucao.motivo_dispensa},
          nao_aplicavel_motivo = ${statusNovo === "NAO_SE_APLICA" ? input.motivo : execucao.nao_aplicavel_motivo},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await this.registrarHistorico(tx, {
        referenciaTipo: "EXECUCAO",
        execucaoId: id,
        modeloId: execucao.modelo_id,
        modeloItemId: execucao.modelo_item_id,
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: statusNovo === "DISPENSADO" ? "DISPENSA" : "NAO_SE_APLICA",
        statusAnterior: execucao.status,
        statusNovo,
        observacao: trimOrUndefined(input.observacao) ?? null,
        motivo: input.motivo,
        origem: "INTERFACE"
      });

      const atualizada = await this.buscarExecucaoPorId(tx, id);
      if (!atualizada) {
        throw new AppError("Falha ao atualizar execução do checklist.", 500);
      }

      return {
        execucao: atualizada,
        historico: await this.listarHistorico({ execucaoId: Number(id), limit: 50 })
      };
    });
  }

  async reabrirExecucao(id: bigint, input: ChecklistExecucaoReaberturaInput, usuarioAtual: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();
    return prisma.$transaction(async (tx) => {
      const execucao = await this.buscarExecucaoPorId(tx, id);
      if (!execucao) {
        throw new AppError("Execução do checklist não encontrada.", 404);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE checklist_execucoes
        SET
          status = 'PENDENTE',
          dispensado_em = NULL,
          dispensado_por_usuario_id = NULL,
          motivo_dispensa = NULL,
          nao_aplicavel_motivo = NULL,
          concluido_em = NULL,
          concluido_por_usuario_id = NULL,
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await this.registrarHistorico(tx, {
        referenciaTipo: "EXECUCAO",
        execucaoId: id,
        modeloId: execucao.modelo_id,
        modeloItemId: execucao.modelo_item_id,
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: "REABERTURA",
        statusAnterior: execucao.status,
        statusNovo: "PENDENTE",
        observacao: trimOrUndefined(input.observacao) ?? null,
        motivo: trimOrUndefined(input.motivo) ?? null,
        origem: "INTERFACE"
      });

      const atualizada = await this.buscarExecucaoPorId(tx, id);
      if (!atualizada) {
        throw new AppError("Falha ao reabrir execução do checklist.", 500);
      }

      return {
        execucao: atualizada,
        historico: await this.listarHistorico({ execucaoId: Number(id), limit: 50 })
      };
    });
  }

  async atualizarConfiguracao(input: ChecklistConfiguracaoInput, usuarioAtual: ChecklistUsuarioAtual) {
    await this.ensureEstrutura();
    return prisma.$transaction(async (tx) => {
      const atual = await this.obterConfiguracao();

      await tx.$executeRaw(Prisma.sql`
        UPDATE checklist_configuracoes
        SET
          sabado_ativo = ${input.sabadoAtivo},
          domingo_ativo = ${input.domingoAtivo},
          atualizado_em = NOW()
        WHERE id = 1
      `);

      await this.registrarHistorico(tx, {
        referenciaTipo: "CONFIGURACAO",
        configuracaoId: BigInt(1),
        usuarioResponsavelId: BigInt(usuarioAtual.id),
        acao: "ATUALIZACAO_CONFIGURACAO",
        origem: "INTERFACE",
        dados: {
          sabadoAnterior: atual.sabado_ativo,
          domingoAnterior: atual.domingo_ativo,
          sabadoNovo: input.sabadoAtivo,
          domingoNovo: input.domingoAtivo
        }
      });

      return this.obterConfiguracao();
    });
  }
}
