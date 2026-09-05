import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { ProjetoIndicadorInput, ProjetoIndicadorMedicaoRow, ProjetoIndicadorRow } from "../projeto-indicadores.types.js";

type ProjetoIndicadorEvidenciaRow = {
  id: bigint;
  indicador_id: bigint;
  nome_arquivo: string;
  referencia_logica: string;
  mime_type: string | null;
  tamanho_bytes: bigint | null;
  checksum: string | null;
  enviado_em: Date;
  ativo: boolean;
};

export class ProjetoIndicadoresRepository {
  async dashboard(tenantId: string, filtros: { projetoId?: bigint; unidadeId?: bigint; periodoDe?: string; periodoAte?: string }) {
    const filtroProjeto = filtros.projetoId ? Prisma.sql`AND i.projeto_id = ${filtros.projetoId}` : Prisma.empty;
    const filtroUnidade = filtros.unidadeId ? Prisma.sql`AND p.unidade_assistencial_id = ${filtros.unidadeId}` : Prisma.empty;
    const filtroMedicaoDe = filtros.periodoDe ? Prisma.sql`AND m.competencia >= ${filtros.periodoDe}::date` : Prisma.empty;
    const filtroMedicaoAte = filtros.periodoAte ? Prisma.sql`AND m.competencia <= ${filtros.periodoAte}::date` : Prisma.empty;
    const [resumo] = await prisma.$queryRaw<{ total_indicadores: bigint; indicadores_ativos: bigint; meta_total: string | number; realizado_total: string | number; percentual_medio: string | number }[]>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total_indicadores,
             COUNT(*) FILTER (WHERE i.status = 'ATIVO')::BIGINT AS indicadores_ativos,
             COALESCE(SUM(i.meta) FILTER (WHERE i.status = 'ATIVO'), 0) AS meta_total,
             COALESCE(SUM(i.valor_atual) FILTER (WHERE i.status = 'ATIVO'), 0) AS realizado_total,
             COALESCE(AVG(CASE WHEN i.meta > 0 THEN LEAST((i.valor_atual / i.meta) * 100, 100) ELSE 0 END) FILTER (WHERE i.status = 'ATIVO'), 0) AS percentual_medio
      FROM projeto_indicador i
      INNER JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id = i.tenant_id
      WHERE i.tenant_id = ${tenantId}::uuid AND p.ativo = TRUE ${filtroProjeto} ${filtroUnidade}
    `);
    const porTipo = await prisma.$queryRaw<{ tipo: string; total: bigint }[]>(Prisma.sql`
      SELECT i.tipo, COUNT(*)::BIGINT AS total FROM projeto_indicador i
      INNER JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id = i.tenant_id
      WHERE i.tenant_id = ${tenantId}::uuid AND i.status = 'ATIVO' AND p.ativo = TRUE ${filtroProjeto} ${filtroUnidade}
      GROUP BY i.tipo ORDER BY i.tipo
    `);
    const evolucao = await prisma.$queryRaw<{ competencia: Date; total: string | number }[]>(Prisma.sql`
      SELECT DATE_TRUNC('month', m.competencia)::DATE AS competencia, COALESCE(SUM(m.valor), 0) AS total
      FROM projeto_indicador_medicao m
      INNER JOIN projeto_indicador i ON i.id = m.indicador_id AND i.tenant_id = m.tenant_id
      INNER JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id = i.tenant_id
      WHERE m.tenant_id = ${tenantId}::uuid AND p.ativo = TRUE ${filtroProjeto} ${filtroUnidade} ${filtroMedicaoDe} ${filtroMedicaoAte}
      GROUP BY DATE_TRUNC('month', m.competencia)::DATE ORDER BY competencia DESC LIMIT 12
    `);
    return { resumo: { totalIndicadores: Number(resumo?.total_indicadores ?? 0), indicadoresAtivos: Number(resumo?.indicadores_ativos ?? 0), metaTotal: Number(resumo?.meta_total ?? 0), realizadoTotal: Number(resumo?.realizado_total ?? 0), percentualMedio: Number(resumo?.percentual_medio ?? 0) }, porTipo: porTipo.map((item) => ({ tipo: item.tipo, total: Number(item.total ?? 0) })), evolucao: evolucao.reverse().map((item) => ({ competencia: item.competencia, total: Number(item.total ?? 0) })) };
  }

  async garantirProjeto(projetoId: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      SELECT id FROM projetos WHERE id = ${projetoId} AND tenant_id = ${tenantId}::uuid AND ativo = TRUE LIMIT 1
    `);
    if (!rows[0]) throw new AppError("Projeto não encontrado para a instituição atual.", 404);
  }

  async listar(projetoId: bigint, tenantId: string): Promise<ProjetoIndicadorRow[]> {
    return prisma.$queryRaw<ProjetoIndicadorRow[]>(Prisma.sql`
      SELECT id, tenant_id, projeto_id, nome, descricao, tipo, unidade_medida, linha_base,
             meta, valor_atual, periodicidade, fonte_dado, responsavel, status, criado_em, atualizado_em
      FROM projeto_indicador
      WHERE projeto_id = ${projetoId} AND tenant_id = ${tenantId}::uuid
      ORDER BY status ASC, nome ASC, id ASC
    `);
  }

  async criar(projetoId: bigint, tenantId: string, input: ProjetoIndicadorInput, actorId?: bigint) {
    try {
      const rows = await prisma.$queryRaw<ProjetoIndicadorRow[]>(Prisma.sql`
        INSERT INTO projeto_indicador
          (tenant_id, projeto_id, nome, descricao, tipo, unidade_medida, linha_base, meta,
           valor_atual, periodicidade, fonte_dado, responsavel, status, criado_por)
        VALUES (${tenantId}::uuid, ${projetoId}, ${input.nome}, ${input.descricao ?? null}, ${input.tipo},
          ${input.unidade_medida}, ${input.linha_base ?? null}, ${input.meta}, ${input.valor_atual ?? 0},
          ${input.periodicidade}, ${input.fonte_dado ?? null}, ${input.responsavel ?? null}, ${input.status ?? "ATIVO"}, ${actorId ?? null})
        RETURNING id, tenant_id, projeto_id, nome, descricao, tipo, unidade_medida, linha_base,
          meta, valor_atual, periodicidade, fonte_dado, responsavel, status, criado_em, atualizado_em
      `);
      return rows[0];
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError("Já existe um indicador com este nome neste projeto.", 409);
      throw error;
    }
  }

  async registrarMedicao(indicadorId: bigint, projetoId: bigint, tenantId: string, competencia: string, valor: number, observacao?: string, evidenciaId?: bigint, actorId?: bigint) {
    try {
      return await prisma.$transaction(async (tx) => {
        const indicador = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
          SELECT id FROM projeto_indicador
          WHERE id = ${indicadorId} AND projeto_id = ${projetoId} AND tenant_id = ${tenantId}::uuid AND status = 'ATIVO'
          FOR UPDATE
        `);
        if (!indicador[0]) throw new AppError("Indicador não encontrado para o projeto atual.", 404);
        if (evidenciaId) {
          const evidencia = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
            SELECT e.id FROM projeto_indicador_evidencia e
            WHERE e.id = ${evidenciaId} AND e.indicador_id = ${indicadorId}
              AND e.tenant_id = ${tenantId}::uuid AND e.ativo = TRUE
            LIMIT 1
          `);
          if (!evidencia[0]) throw new AppError("A evidência selecionada não pertence a este indicador.", 400);
        }
        const medicao = await tx.$queryRaw<ProjetoIndicadorMedicaoRow[]>(Prisma.sql`
          INSERT INTO projeto_indicador_medicao
            (tenant_id, indicador_id, competencia, valor, observacao, evidencia_id, registrado_por)
          VALUES (${tenantId}::uuid, ${indicadorId}, ${competencia}::date, ${valor}, ${observacao ?? null}, ${evidenciaId ?? null}, ${actorId ?? null})
          RETURNING id, indicador_id, competencia, valor, observacao, registrado_em
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE projeto_indicador SET valor_atual = ${valor}, atualizado_em = NOW()
          WHERE id = ${indicadorId} AND projeto_id = ${projetoId} AND tenant_id = ${tenantId}::uuid
        `);
        return medicao[0];
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError("Já existe uma medição para este indicador nesta competência.", 409);
      throw error;
    }
  }

  async listarMedicoes(indicadorId: bigint, projetoId: bigint, tenantId: string): Promise<ProjetoIndicadorMedicaoRow[]> {
    return prisma.$queryRaw<ProjetoIndicadorMedicaoRow[]>(Prisma.sql`
      SELECT m.id, m.indicador_id, m.competencia, m.valor, m.observacao, m.registrado_em
      FROM projeto_indicador_medicao m
      INNER JOIN projeto_indicador i ON i.id = m.indicador_id AND i.tenant_id = m.tenant_id
      WHERE m.indicador_id = ${indicadorId} AND i.projeto_id = ${projetoId} AND m.tenant_id = ${tenantId}::uuid
      ORDER BY m.competencia DESC, m.id DESC
    `);
  }

  async registrarEvidencia(indicadorId: bigint, projetoId: bigint, tenantId: string, arquivo: { nome: string; referencia: string; mime: string; tamanho: number; checksum?: string; usuario?: bigint }) {
    const indicador = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      SELECT id FROM projeto_indicador WHERE id = ${indicadorId} AND projeto_id = ${projetoId} AND tenant_id = ${tenantId}::uuid LIMIT 1
    `);
    if (!indicador[0]) throw new AppError("Indicador não encontrado para o projeto atual.", 404);
    const rows = await prisma.$queryRaw<ProjetoIndicadorEvidenciaRow[]>(Prisma.sql`
      INSERT INTO projeto_indicador_evidencia
        (tenant_id, indicador_id, nome_arquivo, referencia_logica, mime_type, tamanho_bytes, checksum, enviado_por)
      VALUES (${tenantId}::uuid, ${indicadorId}, ${arquivo.nome}, ${arquivo.referencia}, ${arquivo.mime}, ${arquivo.tamanho}, ${arquivo.checksum ?? null}, ${arquivo.usuario ?? null})
      RETURNING id, indicador_id, nome_arquivo, referencia_logica, mime_type, tamanho_bytes, checksum, enviado_em, ativo
    `);
    return rows[0];
  }

  async listarEvidencias(indicadorId: bigint, projetoId: bigint, tenantId: string) {
    return prisma.$queryRaw<ProjetoIndicadorEvidenciaRow[]>(Prisma.sql`
      SELECT e.id, e.indicador_id, e.nome_arquivo, e.referencia_logica, e.mime_type,
             e.tamanho_bytes, e.checksum, e.enviado_em, e.ativo
      FROM projeto_indicador_evidencia e
      INNER JOIN projeto_indicador i ON i.id = e.indicador_id AND i.tenant_id = e.tenant_id
      WHERE e.indicador_id = ${indicadorId} AND i.projeto_id = ${projetoId}
        AND e.tenant_id = ${tenantId}::uuid AND e.ativo = TRUE
      ORDER BY e.enviado_em DESC, e.id DESC
    `);
  }
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const typed = error as { code?: string; meta?: { code?: string } };
  return [typed.code, typed.meta?.code].some((code) => ["P2002", "23505"].includes(String(code)));
}
