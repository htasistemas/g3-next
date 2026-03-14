import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureArquivosEstrutura } from "../../arquivos/repositories/arquivos-estrutura.repository.js";
import { parametrosIniciaisChamadoTecnico } from "../chamado-tecnico.seed.js";
import type {
  ChamadoOrdenacao,
  ChamadoParametroRow,
  ChamadoTecnicoComentarioInput,
  ChamadoTecnicoComentarioRow,
  ChamadoTecnicoFiltroSalvoInput,
  ChamadoTecnicoFiltroSalvoRow,
  ChamadoTecnicoHistoricoRow,
  ChamadoTecnicoInput,
  ChamadoTecnicoListRow,
  ChamadoTecnicoListaFiltros,
  ChamadoTecnicoParametroInput,
  ChamadoTecnicoRow,
  ChamadoTecnicoStatusInput,
  ChamadoTecnicoVinculoInput,
  ChamadoTecnicoVinculoRow,
  ChamadoUsuarioRow
} from "../chamado-tecnico.types.js";

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_parametro (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(60) NOT NULL,
    chave VARCHAR(80) NOT NULL,
    nome VARCHAR(140) NOT NULL,
    descricao TEXT,
    cor VARCHAR(40),
    ordem INTEGER NOT NULL DEFAULT 0,
    padrao BOOLEAN NOT NULL DEFAULT FALSE,
    sla_horas INTEGER,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    metadados_json JSONB,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT g3n_chamado_tecnico_parametro_tipo_chave_uidx UNIQUE (tipo, chave)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    solicitante VARCHAR(160) NOT NULL,
    interessado VARCHAR(160),
    cliente VARCHAR(160),
    sistema_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    projeto_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    sprint_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    tipo_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    categoria_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    prioridade_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    situacao_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    criador_usuario_id BIGINT,
    responsavel_usuario_id BIGINT,
    origem_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    motivo_reabertura_id BIGINT REFERENCES g3n_chamado_tecnico_parametro(id),
    chamado_relacionado_id BIGINT REFERENCES g3n_chamado_tecnico(id),
    fechado_por_usuario_id BIGINT,
    sla_prazo_horas INTEGER,
    sla_vencimento_em TIMESTAMP,
    resumo VARCHAR(240) NOT NULL,
    descricao TEXT NOT NULL,
    passos_reproduzir TEXT,
    resultado_esperado TEXT,
    resultado_obtido TEXT,
    ambiente VARCHAR(80),
    navegador_dispositivo TEXT,
    url_tela TEXT,
    modulo_afetado VARCHAR(160),
    impacto_uso TEXT,
    quantidade_usuarios_afetados INTEGER,
    versao_sistema VARCHAR(80),
    numero_release VARCHAR(80),
    resolucao TEXT,
    justificativa_reabertura TEXT,
    tags_texto TEXT,
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
    ultima_atualizacao TIMESTAMP NOT NULL DEFAULT NOW(),
    resolvido_em TIMESTAMP,
    fechado_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    ativo BOOLEAN NOT NULL DEFAULT TRUE
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_comentario (
    id BIGSERIAL PRIMARY KEY,
    chamado_id BIGINT NOT NULL REFERENCES g3n_chamado_tecnico(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    interno BOOLEAN NOT NULL DEFAULT FALSE,
    visivel_solicitante BOOLEAN NOT NULL DEFAULT TRUE,
    mencao_usuario_id BIGINT,
    criado_por_usuario_id BIGINT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_historico (
    id BIGSERIAL PRIMARY KEY,
    chamado_id BIGINT NOT NULL REFERENCES g3n_chamado_tecnico(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(60) NOT NULL,
    campo VARCHAR(120),
    descricao TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT,
    usuario_id BIGINT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_vinculo (
    id BIGSERIAL PRIMARY KEY,
    chamado_id BIGINT NOT NULL REFERENCES g3n_chamado_tecnico(id) ON DELETE CASCADE,
    tipo_vinculo VARCHAR(80) NOT NULL,
    referencia_id VARCHAR(120),
    referencia_descricao TEXT NOT NULL,
    criado_por_usuario_id BIGINT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_filtro_salvo (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    filtro_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    padrao BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS g3n_chamado_tecnico_usuario_estado (
    chamado_id BIGINT NOT NULL REFERENCES g3n_chamado_tecnico(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL,
    ultimo_acesso_em TIMESTAMP,
    ultimo_comentario_lido_em TIMESTAMP,
    PRIMARY KEY (chamado_id, usuario_id)
  )
  `,
  "CREATE INDEX IF NOT EXISTS g3n_chamado_tecnico_codigo_idx ON g3n_chamado_tecnico(codigo)",
  "CREATE INDEX IF NOT EXISTS g3n_chamado_tecnico_situacao_idx ON g3n_chamado_tecnico(situacao_id)",
  "CREATE INDEX IF NOT EXISTS g3n_chamado_tecnico_prioridade_idx ON g3n_chamado_tecnico(prioridade_id)",
  "CREATE INDEX IF NOT EXISTS g3n_chamado_tecnico_responsavel_idx ON g3n_chamado_tecnico(responsavel_usuario_id)",
  "CREATE INDEX IF NOT EXISTS g3n_chamado_tecnico_atualizacao_idx ON g3n_chamado_tecnico(ultima_atualizacao DESC)",
  "CREATE UNIQUE INDEX IF NOT EXISTS g3n_chamado_tecnico_filtro_salvo_usuario_nome_uidx ON g3n_chamado_tecnico_filtro_salvo(usuario_id, nome)"
] as const;

type ListaResponse = {
  rows: ChamadoTecnicoListRow[];
  total: number;
  resumo: Record<string, unknown>;
};

let estruturaGarantida = false;

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildWhereClauses(filters: ChamadoTecnicoListaFiltros) {
  const clauses: Prisma.Sql[] = [Prisma.sql`c.ativo = TRUE`];
  if (filters.codigo) clauses.push(Prisma.sql`c.codigo ILIKE ${`%${filters.codigo}%`}`);
  if (filters.resumo) clauses.push(Prisma.sql`c.resumo ILIKE ${`%${filters.resumo}%`}`);
  if (filters.situacao_id) clauses.push(Prisma.sql`c.situacao_id = ${BigInt(filters.situacao_id)}`);
  if (filters.tipo_id) clauses.push(Prisma.sql`c.tipo_id = ${BigInt(filters.tipo_id)}`);
  if (filters.prioridade_id) clauses.push(Prisma.sql`c.prioridade_id = ${BigInt(filters.prioridade_id)}`);
  if (filters.categoria_id) clauses.push(Prisma.sql`c.categoria_id = ${BigInt(filters.categoria_id)}`);
  if (filters.sistema_id) clauses.push(Prisma.sql`c.sistema_id = ${BigInt(filters.sistema_id)}`);
  if (filters.projeto_id) clauses.push(Prisma.sql`c.projeto_id = ${BigInt(filters.projeto_id)}`);
  if (filters.sprint_id) clauses.push(Prisma.sql`c.sprint_id = ${BigInt(filters.sprint_id)}`);
  if (filters.criador_usuario_id) clauses.push(Prisma.sql`c.criador_usuario_id = ${BigInt(filters.criador_usuario_id)}`);
  if (filters.responsavel_usuario_id) clauses.push(Prisma.sql`c.responsavel_usuario_id = ${BigInt(filters.responsavel_usuario_id)}`);
  if (filters.cliente) clauses.push(Prisma.sql`COALESCE(c.cliente, '') ILIKE ${`%${filters.cliente}%`}`);
  if (filters.solicitante) clauses.push(Prisma.sql`c.solicitante ILIKE ${`%${filters.solicitante}%`}`);
  if (filters.resolucao) clauses.push(Prisma.sql`COALESCE(c.resolucao, '') ILIKE ${`%${filters.resolucao}%`}`);
  if (filters.historico) {
    clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM g3n_chamado_tecnico_historico h WHERE h.chamado_id = c.id AND h.descricao ILIKE ${`%${filters.historico}%`})`);
  }
  const dataInicio = parseDate(filters.data_criacao_inicio);
  if (dataInicio) clauses.push(Prisma.sql`c.data_criacao >= ${dataInicio}`);
  const dataFim = parseDate(filters.data_criacao_fim);
  if (dataFim) clauses.push(Prisma.sql`c.data_criacao < ${new Date(dataFim.getTime() + 86400000)}`);
  if (filters.inatividade_dias) clauses.push(Prisma.sql`c.ultima_atualizacao < NOW() - (${filters.inatividade_dias} * INTERVAL '1 day')`);
  if (filters.ultima_atualizacao && /^\d{4}-\d{2}-\d{2}$/.test(filters.ultima_atualizacao)) {
    clauses.push(Prisma.sql`DATE(c.ultima_atualizacao) = ${parseDate(filters.ultima_atualizacao)}`);
  }
  if (filters.texto) {
    const like = `%${filters.texto}%`;
    clauses.push(Prisma.sql`(c.codigo ILIKE ${like} OR c.resumo ILIKE ${like} OR c.descricao ILIKE ${like} OR COALESCE(c.cliente, '') ILIKE ${like} OR c.solicitante ILIKE ${like})`);
  }
  return clauses;
}

function buildOrderBy(ordenacao?: ChamadoOrdenacao, direcao: "asc" | "desc" = "desc") {
  const orderDirection = direcao === "asc" ? Prisma.raw("ASC") : Prisma.raw("DESC");
  switch (ordenacao) {
    case "data_criacao":
      return Prisma.sql`c.data_criacao ${orderDirection}, c.id DESC`;
    case "prioridade":
      return Prisma.sql`COALESCE(prio.ordem, 999) ${orderDirection}, c.ultima_atualizacao DESC`;
    case "situacao":
      return Prisma.sql`COALESCE(sit.ordem, 999) ${orderDirection}, c.ultima_atualizacao DESC`;
    case "responsavel":
      return Prisma.sql`LOWER(COALESCE(resp.nome_exibicao, resp.nome_completo, resp.nome_usuario, '')) ${orderDirection}, c.ultima_atualizacao DESC`;
    case "cliente":
      return Prisma.sql`LOWER(COALESCE(c.cliente, '')) ${orderDirection}, c.ultima_atualizacao DESC`;
    case "sistema":
      return Prisma.sql`LOWER(COALESCE(sistema.nome, '')) ${orderDirection}, c.ultima_atualizacao DESC`;
    case "ultima_atualizacao":
    default:
      return Prisma.sql`c.ultima_atualizacao ${orderDirection}, c.id DESC`;
  }
}

export class ChamadoTecnicoRepository {
  private async garantirEstrutura() {
    if (estruturaGarantida) return;

    await ensureArquivosEstrutura(prisma);
    for (const comando of estruturaSql) {
      await prisma.$executeRawUnsafe(comando);
    }

    for (const parametro of parametrosIniciaisChamadoTecnico) {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO g3n_chamado_tecnico_parametro (tipo, chave, nome, cor, ordem, padrao, sla_horas, ativo, criado_em, atualizado_em)
          VALUES (
            ${parametro.tipo},
            ${parametro.chave},
            ${parametro.nome},
            ${parametro.cor ?? null},
            ${parametro.ordem},
            ${"padrao" in parametro ? parametro.padrao : false},
            ${"slaHoras" in parametro ? parametro.slaHoras : null},
            TRUE,
            NOW(),
            NOW()
          )
          ON CONFLICT (tipo, chave)
          DO UPDATE SET
            nome = EXCLUDED.nome,
            cor = COALESCE(EXCLUDED.cor, g3n_chamado_tecnico_parametro.cor),
            ordem = EXCLUDED.ordem,
            padrao = EXCLUDED.padrao,
            sla_horas = COALESCE(EXCLUDED.sla_horas, g3n_chamado_tecnico_parametro.sla_horas),
            atualizado_em = NOW()
        `
      );
    }

    estruturaGarantida = true;
  }

  async listarParametros(tipo?: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<ChamadoParametroRow[]>(Prisma.sql`
      SELECT id, tipo, chave, nome, descricao, cor, ordem, padrao, sla_horas, ativo, metadados_json, criado_em, atualizado_em
      FROM g3n_chamado_tecnico_parametro
      WHERE (${tipo ?? null} IS NULL OR tipo = ${tipo ?? null})
      ORDER BY tipo ASC, ordem ASC, nome ASC
    `);
  }

  async buscarParametroPorId(id: bigint) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<ChamadoParametroRow[]>(Prisma.sql`
      SELECT id, tipo, chave, nome, descricao, cor, ordem, padrao, sla_horas, ativo, metadados_json, criado_em, atualizado_em
      FROM g3n_chamado_tecnico_parametro
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarParametroPorChave(tipo: string, chave: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<ChamadoParametroRow[]>(Prisma.sql`
      SELECT id, tipo, chave, nome, descricao, cor, ordem, padrao, sla_horas, ativo, metadados_json, criado_em, atualizado_em
      FROM g3n_chamado_tecnico_parametro
      WHERE tipo = ${tipo}
        AND chave = ${chave}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async listarUsuariosCatalogo() {
    await this.garantirEstrutura();
    return prisma.$queryRaw<ChamadoUsuarioRow[]>(Prisma.sql`
      SELECT id, nome_usuario, nome_completo, nome_exibicao, email, status
      FROM usuarios
      ORDER BY COALESCE(nome_exibicao, nome_completo, nome_usuario) ASC
    `);
  }

  async salvarParametro(input: ChamadoTecnicoParametroInput, id?: bigint) {
    await this.garantirEstrutura();
    if (input.padrao) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE g3n_chamado_tecnico_parametro
        SET padrao = FALSE, atualizado_em = NOW()
        WHERE tipo = ${input.tipo}
          AND (${id ?? null} IS NULL OR id <> ${id ?? null})
      `);
    }

    if (id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE g3n_chamado_tecnico_parametro
        SET
          tipo = ${input.tipo},
          chave = ${input.chave},
          nome = ${input.nome},
          descricao = ${input.descricao ?? null},
          cor = ${input.cor ?? null},
          ordem = ${input.ordem ?? 0},
          padrao = ${input.padrao ?? false},
          sla_horas = ${input.sla_horas ?? null},
          ativo = ${input.ativo ?? true},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
      const atualizado = await this.buscarParametroPorId(id);
      if (!atualizado) throw new AppError("Parametro nao encontrado.", 404);
      return atualizado;
    }

    const rows = await prisma.$queryRaw<ChamadoParametroRow[]>(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_parametro (
        tipo, chave, nome, descricao, cor, ordem, padrao, sla_horas, ativo, criado_em, atualizado_em
      ) VALUES (
        ${input.tipo}, ${input.chave}, ${input.nome}, ${input.descricao ?? null}, ${input.cor ?? null},
        ${input.ordem ?? 0}, ${input.padrao ?? false}, ${input.sla_horas ?? null}, ${input.ativo ?? true},
        NOW(), NOW()
      )
      RETURNING id, tipo, chave, nome, descricao, cor, ordem, padrao, sla_horas, ativo, metadados_json, criado_em, atualizado_em
    `);
    const parametro = rows[0];
    if (!parametro) throw new AppError("Nao foi possivel criar o parametro.", 500);
    return parametro;
  }

  async listar(filters: ChamadoTecnicoListaFiltros, usuarioId: bigint): Promise<ListaResponse> {
    await this.garantirEstrutura();
    const clauses = buildWhereClauses(filters);
    const whereSql = Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
    const orderBySql = buildOrderBy(filters.ordenacao, filters.direcao);
    const limite = Math.max(1, Math.min(filters.limite ?? 20, 100));
    const pagina = Math.max(1, filters.pagina ?? 1);
    const offset = (pagina - 1) * limite;

    const rows = await prisma.$queryRaw<ChamadoTecnicoListRow[]>(Prisma.sql`
      SELECT
        c.*,
        COALESCE(anexos.total, 0)::BIGINT AS anexos_quantidade,
        COALESCE(comentarios.nao_lidos, 0)::BIGINT AS comentarios_nao_lidos
      FROM g3n_chamado_tecnico c
      LEFT JOIN g3n_chamado_tecnico_parametro sit ON sit.id = c.situacao_id
      LEFT JOIN g3n_chamado_tecnico_parametro prio ON prio.id = c.prioridade_id
      LEFT JOIN g3n_chamado_tecnico_parametro sistema ON sistema.id = c.sistema_id
      LEFT JOIN usuarios resp ON resp.id = c.responsavel_usuario_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM arquivos a
        WHERE a.entidade_tipo = 'chamado_tecnico'
          AND a.entidade_id = c.id
          AND a.ativo = TRUE
      ) anexos ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS nao_lidos
        FROM g3n_chamado_tecnico_comentario cc
        LEFT JOIN g3n_chamado_tecnico_usuario_estado ue
          ON ue.chamado_id = c.id
         AND ue.usuario_id = ${usuarioId}
        WHERE cc.chamado_id = c.id
          AND (cc.criado_por_usuario_id IS NULL OR cc.criado_por_usuario_id <> ${usuarioId})
          AND cc.criado_em > COALESCE(ue.ultimo_comentario_lido_em, TO_TIMESTAMP(0))
      ) comentarios ON TRUE
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ${limite}
      OFFSET ${offset}
    `);

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM g3n_chamado_tecnico c
      ${whereSql}
    `);

    const cards = await prisma.$queryRaw<
      Array<{
        total_abertos: bigint;
        atribuidos_a_mim: bigint;
        resolvidos_hoje: bigint;
        em_atraso: bigint;
        aguardando_meu_retorno: bigint;
        criticos: bigint;
        reabertos: bigint;
        sem_atualizacao: bigint;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(sit.chave, '') NOT IN ('FECHADO', 'CANCELADO'))::BIGINT AS total_abertos,
        COUNT(*) FILTER (WHERE c.responsavel_usuario_id = ${usuarioId})::BIGINT AS atribuidos_a_mim,
        COUNT(*) FILTER (WHERE COALESCE(sit.chave, '') = 'RESOLVIDO' AND DATE(COALESCE(c.resolvido_em, c.ultima_atualizacao)) = CURRENT_DATE)::BIGINT AS resolvidos_hoje,
        COUNT(*) FILTER (WHERE c.sla_vencimento_em IS NOT NULL AND c.sla_vencimento_em < NOW() AND COALESCE(sit.chave, '') NOT IN ('RESOLVIDO', 'FECHADO', 'CANCELADO'))::BIGINT AS em_atraso,
        COUNT(*) FILTER (WHERE COALESCE(sit.chave, '') = 'AGUARDANDO_RETORNO_SOLICITANTE')::BIGINT AS aguardando_meu_retorno,
        COUNT(*) FILTER (WHERE COALESCE(prio.chave, '') = 'URGENTE')::BIGINT AS criticos,
        COUNT(*) FILTER (WHERE COALESCE(sit.chave, '') = 'REABERTO')::BIGINT AS reabertos,
        COUNT(*) FILTER (WHERE c.ultima_atualizacao < NOW() - INTERVAL '7 days')::BIGINT AS sem_atualizacao
      FROM g3n_chamado_tecnico c
      LEFT JOIN g3n_chamado_tecnico_parametro sit ON sit.id = c.situacao_id
      LEFT JOIN g3n_chamado_tecnico_parametro prio ON prio.id = c.prioridade_id
      ${whereSql}
    `);

    return {
      rows,
      total: Number(totalRows[0]?.total ?? 0n),
      resumo: {
        cards: {
          totalAbertos: Number(cards[0]?.total_abertos ?? 0n),
          atribuidosAMim: Number(cards[0]?.atribuidos_a_mim ?? 0n),
          resolvidosHoje: Number(cards[0]?.resolvidos_hoje ?? 0n),
          emAtraso: Number(cards[0]?.em_atraso ?? 0n),
          aguardandoMeuRetorno: Number(cards[0]?.aguardando_meu_retorno ?? 0n),
          criticos: Number(cards[0]?.criticos ?? 0n),
          reabertos: Number(cards[0]?.reabertos ?? 0n),
          semAtualizacaoMaisSeteDias: Number(cards[0]?.sem_atualizacao ?? 0n)
        }
      }
    };
  }

  async listarExportacao(filters: ChamadoTecnicoListaFiltros, usuarioId: bigint) {
    await this.garantirEstrutura();
    const clauses = buildWhereClauses(filters);
    const whereSql = Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
    const orderBySql = buildOrderBy(filters.ordenacao, filters.direcao);

    return prisma.$queryRaw<ChamadoTecnicoListRow[]>(Prisma.sql`
      SELECT
        c.*,
        COALESCE(anexos.total, 0)::BIGINT AS anexos_quantidade,
        COALESCE(comentarios.nao_lidos, 0)::BIGINT AS comentarios_nao_lidos
      FROM g3n_chamado_tecnico c
      LEFT JOIN g3n_chamado_tecnico_parametro sit ON sit.id = c.situacao_id
      LEFT JOIN g3n_chamado_tecnico_parametro prio ON prio.id = c.prioridade_id
      LEFT JOIN g3n_chamado_tecnico_parametro sistema ON sistema.id = c.sistema_id
      LEFT JOIN usuarios resp ON resp.id = c.responsavel_usuario_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM arquivos a
        WHERE a.entidade_tipo = 'chamado_tecnico'
          AND a.entidade_id = c.id
          AND a.ativo = TRUE
      ) anexos ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS nao_lidos
        FROM g3n_chamado_tecnico_comentario cc
        LEFT JOIN g3n_chamado_tecnico_usuario_estado ue
          ON ue.chamado_id = c.id
         AND ue.usuario_id = ${usuarioId}
        WHERE cc.chamado_id = c.id
          AND (cc.criado_por_usuario_id IS NULL OR cc.criado_por_usuario_id <> ${usuarioId})
          AND cc.criado_em > COALESCE(ue.ultimo_comentario_lido_em, TO_TIMESTAMP(0))
      ) comentarios ON TRUE
      ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT 5000
    `);
  }

  async buscarPorId(id: bigint) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<ChamadoTecnicoRow[]>(Prisma.sql`
      SELECT *
      FROM g3n_chamado_tecnico
      WHERE id = ${id}
        AND ativo = TRUE
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const chamado = await this.buscarPorId(id);
    if (!chamado) {
      throw new AppError("Chamado tecnico nao encontrado.", 404);
    }
    return chamado;
  }

  async criar(input: ChamadoTecnicoInput, criadorUsuarioId: bigint, situacaoId: bigint) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico (
        codigo, solicitante, interessado, cliente, sistema_id, projeto_id, sprint_id, tipo_id, categoria_id, prioridade_id,
        situacao_id, criador_usuario_id, responsavel_usuario_id, origem_id, motivo_reabertura_id, chamado_relacionado_id,
        sla_prazo_horas, sla_vencimento_em, resumo, descricao, passos_reproduzir, resultado_esperado, resultado_obtido,
        ambiente, navegador_dispositivo, url_tela, modulo_afetado, impacto_uso, quantidade_usuarios_afetados,
        versao_sistema, numero_release, resolucao, justificativa_reabertura, tags_texto, data_criacao, ultima_atualizacao,
        criado_em, atualizado_em, ativo
      ) VALUES (
        'PENDENTE', ${input.solicitante}, ${input.interessado ?? null}, ${input.cliente ?? null}, ${BigInt(input.sistema_id)},
        ${input.projeto_id ? BigInt(input.projeto_id) : null}, ${input.sprint_id ? BigInt(input.sprint_id) : null},
        ${BigInt(input.tipo_id)}, ${input.categoria_id ? BigInt(input.categoria_id) : null}, ${BigInt(input.prioridade_id)}, ${situacaoId},
        ${criadorUsuarioId}, ${input.responsavel_usuario_id ? BigInt(input.responsavel_usuario_id) : null},
        ${input.origem_id ? BigInt(input.origem_id) : null}, ${input.motivo_reabertura_id ? BigInt(input.motivo_reabertura_id) : null},
        ${input.chamado_relacionado_id ? BigInt(input.chamado_relacionado_id) : null}, ${input.sla_prazo_horas ?? null},
        ${input.sla_prazo_horas ? new Date(Date.now() + input.sla_prazo_horas * 3600000) : null},
        ${input.resumo}, ${input.descricao}, ${input.passos_reproduzir ?? null}, ${input.resultado_esperado ?? null},
        ${input.resultado_obtido ?? null}, ${input.ambiente ?? null}, ${input.navegador_dispositivo ?? null},
        ${input.url_tela ?? null}, ${input.modulo_afetado ?? null}, ${input.impacto_uso ?? null},
        ${input.quantidade_usuarios_afetados ?? null}, ${input.versao_sistema ?? null}, ${input.numero_release ?? null},
        ${input.resolucao ?? null}, ${input.justificativa_reabertura ?? null}, ${input.tags?.join(";") ?? null},
        NOW(), NOW(), NOW(), NOW(), TRUE
      )
      RETURNING id
    `);

    const id = rows[0]?.id;
    if (!id) throw new AppError("Nao foi possivel criar o chamado tecnico.", 500);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE g3n_chamado_tecnico
      SET codigo = ${`CT-${String(id).padStart(6, "0")}`}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: ChamadoTecnicoInput, situacaoId?: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE g3n_chamado_tecnico
      SET
        solicitante = ${input.solicitante},
        interessado = ${input.interessado ?? null},
        cliente = ${input.cliente ?? null},
        sistema_id = ${BigInt(input.sistema_id)},
        projeto_id = ${input.projeto_id ? BigInt(input.projeto_id) : null},
        sprint_id = ${input.sprint_id ? BigInt(input.sprint_id) : null},
        tipo_id = ${BigInt(input.tipo_id)},
        categoria_id = ${input.categoria_id ? BigInt(input.categoria_id) : null},
        prioridade_id = ${BigInt(input.prioridade_id)},
        situacao_id = COALESCE(${situacaoId ?? null}, situacao_id),
        responsavel_usuario_id = ${input.responsavel_usuario_id ? BigInt(input.responsavel_usuario_id) : null},
        origem_id = ${input.origem_id ? BigInt(input.origem_id) : null},
        motivo_reabertura_id = ${input.motivo_reabertura_id ? BigInt(input.motivo_reabertura_id) : null},
        chamado_relacionado_id = ${input.chamado_relacionado_id ? BigInt(input.chamado_relacionado_id) : null},
        sla_prazo_horas = ${input.sla_prazo_horas ?? null},
        sla_vencimento_em = ${input.sla_prazo_horas ? new Date(Date.now() + input.sla_prazo_horas * 3600000) : null},
        resumo = ${input.resumo},
        descricao = ${input.descricao},
        passos_reproduzir = ${input.passos_reproduzir ?? null},
        resultado_esperado = ${input.resultado_esperado ?? null},
        resultado_obtido = ${input.resultado_obtido ?? null},
        ambiente = ${input.ambiente ?? null},
        navegador_dispositivo = ${input.navegador_dispositivo ?? null},
        url_tela = ${input.url_tela ?? null},
        modulo_afetado = ${input.modulo_afetado ?? null},
        impacto_uso = ${input.impacto_uso ?? null},
        quantidade_usuarios_afetados = ${input.quantidade_usuarios_afetados ?? null},
        versao_sistema = ${input.versao_sistema ?? null},
        numero_release = ${input.numero_release ?? null},
        resolucao = ${input.resolucao ?? null},
        justificativa_reabertura = ${input.justificativa_reabertura ?? null},
        tags_texto = ${input.tags?.join(";") ?? null},
        ultima_atualizacao = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarPorIdOuFalhar(id);
  }

  async registrarResolucao(
    id: bigint,
    situacaoId: bigint,
    options: {
      resolucao?: string | null;
      justificativa_reabertura?: string | null;
      motivo_reabertura_id?: bigint | null;
      responsavel_usuario_id?: bigint | null;
      resolvido_em?: Date | null;
      fechado_em?: Date | null;
      fechado_por_usuario_id?: bigint | null;
    }
  ) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE g3n_chamado_tecnico
      SET
        situacao_id = ${situacaoId},
        responsavel_usuario_id = COALESCE(${options.responsavel_usuario_id ?? null}, responsavel_usuario_id),
        resolucao = COALESCE(${options.resolucao ?? null}, resolucao),
        justificativa_reabertura = COALESCE(${options.justificativa_reabertura ?? null}, justificativa_reabertura),
        motivo_reabertura_id = COALESCE(${options.motivo_reabertura_id ?? null}, motivo_reabertura_id),
        resolvido_em = ${options.resolvido_em ?? null},
        fechado_em = ${options.fechado_em ?? null},
        fechado_por_usuario_id = ${options.fechado_por_usuario_id ?? null},
        ultima_atualizacao = NOW(),
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarPorIdOuFalhar(id);
  }

  async desativar(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE g3n_chamado_tecnico
      SET ativo = FALSE, ultima_atualizacao = NOW(), atualizado_em = NOW()
      WHERE id = ${id}
    `);
  }

  async salvarComentario(chamadoId: bigint, input: ChamadoTecnicoComentarioInput, usuarioId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    const rows = await prisma.$queryRaw<ChamadoTecnicoComentarioRow[]>(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_comentario (
        chamado_id, comentario, interno, visivel_solicitante, mencao_usuario_id, criado_por_usuario_id, criado_em, atualizado_em
      ) VALUES (
        ${chamadoId}, ${input.comentario}, ${input.interno ?? false}, ${input.visivel_solicitante ?? true},
        ${input.mencao_usuario_id ? BigInt(input.mencao_usuario_id) : null}, ${usuarioId}, NOW(), NOW()
      )
      RETURNING *
    `);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE g3n_chamado_tecnico
      SET ultima_atualizacao = NOW(), atualizado_em = NOW()
      WHERE id = ${chamadoId}
    `);
    await this.marcarComentariosComoLidos(chamadoId, usuarioId);
    const comentario = rows[0];
    if (!comentario) throw new AppError("Nao foi possivel registrar o comentario.", 500);
    return comentario;
  }

  async listarComentarios(chamadoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    return prisma.$queryRaw<ChamadoTecnicoComentarioRow[]>(Prisma.sql`
      SELECT *
      FROM g3n_chamado_tecnico_comentario
      WHERE chamado_id = ${chamadoId}
      ORDER BY criado_em ASC, id ASC
    `);
  }

  async registrarHistorico(
    chamadoId: bigint,
    payload: {
      tipo_evento: string;
      campo?: string;
      descricao: string;
      valor_anterior?: string | null;
      valor_novo?: string | null;
      usuario_id?: bigint | null;
    }
  ) {
    await this.buscarPorIdOuFalhar(chamadoId);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_historico (
        chamado_id, tipo_evento, campo, descricao, valor_anterior, valor_novo, usuario_id, criado_em
      ) VALUES (
        ${chamadoId}, ${payload.tipo_evento}, ${payload.campo ?? null}, ${payload.descricao},
        ${payload.valor_anterior ?? null}, ${payload.valor_novo ?? null}, ${payload.usuario_id ?? null}, NOW()
      )
    `);
  }

  async listarHistorico(chamadoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    return prisma.$queryRaw<ChamadoTecnicoHistoricoRow[]>(Prisma.sql`
      SELECT *
      FROM g3n_chamado_tecnico_historico
      WHERE chamado_id = ${chamadoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async salvarVinculo(chamadoId: bigint, input: ChamadoTecnicoVinculoInput, usuarioId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    const rows = await prisma.$queryRaw<ChamadoTecnicoVinculoRow[]>(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_vinculo (
        chamado_id, tipo_vinculo, referencia_id, referencia_descricao, criado_por_usuario_id, criado_em
      ) VALUES (
        ${chamadoId}, ${input.tipo_vinculo}, ${input.referencia_id ?? null}, ${input.referencia_descricao}, ${usuarioId}, NOW()
      )
      RETURNING *
    `);
    const vinculo = rows[0];
    if (!vinculo) throw new AppError("Nao foi possivel salvar o vinculo do chamado.", 500);
    return vinculo;
  }

  async listarVinculos(chamadoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    return prisma.$queryRaw<ChamadoTecnicoVinculoRow[]>(Prisma.sql`
      SELECT *
      FROM g3n_chamado_tecnico_vinculo
      WHERE chamado_id = ${chamadoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async removerVinculo(chamadoId: bigint, vinculoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM g3n_chamado_tecnico_vinculo
      WHERE id = ${vinculoId}
        AND chamado_id = ${chamadoId}
    `);
  }

  async listarAnexos(chamadoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        nome_original: string;
        nome_arquivo: string;
        caminho_arquivo: string;
        thumbnail_caminho: string | null;
        mime_type: string;
        tamanho_bytes: bigint;
        data_upload: Date;
        usuario_upload_id: bigint | null;
      }>
    >(Prisma.sql`
      SELECT id, nome_original, nome_arquivo, caminho_arquivo, thumbnail_caminho, mime_type, tamanho_bytes, data_upload, usuario_upload_id
      FROM arquivos
      WHERE entidade_tipo = 'chamado_tecnico'
        AND entidade_id = ${chamadoId}
        AND ativo = TRUE
      ORDER BY data_upload DESC, id DESC
    `);
  }

  async buscarAnexoPorId(chamadoId: bigint, arquivoId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    const rows = await prisma.$queryRaw<Array<{ id: bigint; caminho_arquivo: string }>>(Prisma.sql`
      SELECT id, caminho_arquivo
      FROM arquivos
      WHERE id = ${arquivoId}
        AND entidade_tipo = 'chamado_tecnico'
        AND entidade_id = ${chamadoId}
        AND ativo = TRUE
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async listarFiltrosSalvos(usuarioId: bigint) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<ChamadoTecnicoFiltroSalvoRow[]>(Prisma.sql`
      SELECT *
      FROM g3n_chamado_tecnico_filtro_salvo
      WHERE usuario_id = ${usuarioId}
      ORDER BY padrao DESC, nome ASC
    `);
  }

  async salvarFiltroSalvo(usuarioId: bigint, input: ChamadoTecnicoFiltroSalvoInput, id?: bigint) {
    await this.garantirEstrutura();
    if (input.padrao) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE g3n_chamado_tecnico_filtro_salvo
        SET padrao = FALSE, atualizado_em = NOW()
        WHERE usuario_id = ${usuarioId}
          AND (${id ?? null} IS NULL OR id <> ${id ?? null})
      `);
    }

    if (id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE g3n_chamado_tecnico_filtro_salvo
        SET nome = ${input.nome}, filtro_json = ${JSON.stringify(input.filtros)}::jsonb, padrao = ${input.padrao ?? false}, atualizado_em = NOW()
        WHERE id = ${id}
          AND usuario_id = ${usuarioId}
      `);
      return (await this.listarFiltrosSalvos(usuarioId)).find((item) => item.id === id) ?? null;
    }

    const rows = await prisma.$queryRaw<ChamadoTecnicoFiltroSalvoRow[]>(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_filtro_salvo (usuario_id, nome, filtro_json, padrao, criado_em, atualizado_em)
      VALUES (${usuarioId}, ${input.nome}, ${JSON.stringify(input.filtros)}::jsonb, ${input.padrao ?? false}, NOW(), NOW())
      RETURNING *
    `);
    const filtro = rows[0];
    if (!filtro) throw new AppError("Nao foi possivel salvar o filtro.", 500);
    return filtro;
  }

  async removerFiltroSalvo(usuarioId: bigint, id: bigint) {
    await this.garantirEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM g3n_chamado_tecnico_filtro_salvo
      WHERE id = ${id}
        AND usuario_id = ${usuarioId}
    `);
  }

  async marcarAcesso(chamadoId: bigint, usuarioId: bigint) {
    await this.buscarPorIdOuFalhar(chamadoId);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO g3n_chamado_tecnico_usuario_estado (chamado_id, usuario_id, ultimo_acesso_em, ultimo_comentario_lido_em)
      VALUES (${chamadoId}, ${usuarioId}, NOW(), NOW())
      ON CONFLICT (chamado_id, usuario_id)
      DO UPDATE SET ultimo_acesso_em = NOW(), ultimo_comentario_lido_em = NOW()
    `);
  }

  async marcarComentariosComoLidos(chamadoId: bigint, usuarioId: bigint) {
    await this.marcarAcesso(chamadoId, usuarioId);
  }
}
