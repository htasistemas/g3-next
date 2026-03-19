import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toStringId, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DataComemorativaAuditoriaRow,
  DataComemorativaConfig,
  DataComemorativaContexto,
  DataComemorativaFilters,
  DataComemorativaImportItem,
  DataComemorativaInput,
  DataComemorativaLogItem,
  DataComemorativaPopupLogRow,
  DataComemorativaRow,
  DataComemorativaSyncFinishInput,
  DataComemorativaSyncLogRow,
  DataComemorativaSyncStartInput
} from "../datas-comemorativas.types.js";

type ListaResultado = {
  rows: DataComemorativaRow[];
  total: number;
};

const permissoesModulo = [
  "DATAS_COMEMORATIVAS_VISUALIZAR",
  "DATAS_COMEMORATIVAS_CADASTRAR",
  "DATAS_COMEMORATIVAS_EDITAR",
  "DATAS_COMEMORATIVAS_EXCLUIR",
  "DATAS_COMEMORATIVAS_ATIVAR",
  "DATAS_COMEMORATIVAS_IMPORTAR",
  "DATAS_COMEMORATIVAS_SINCRONIZAR",
  "DATAS_COMEMORATIVAS_CONFIGURAR",
  "DATAS_COMEMORATIVAS_VISUALIZAR_LOGS"
];

const sqlEstrutura = [
  `
    CREATE TABLE IF NOT EXISTS datas_comemorativas (
      id BIGSERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      descricao TEXT,
      dia SMALLINT NOT NULL,
      mes SMALLINT NOT NULL,
      ano SMALLINT,
      data_evento DATE,
      tipo_evento VARCHAR(40) NOT NULL,
      abrangencia VARCHAR(30) NOT NULL,
      uf CHAR(2),
      municipio VARCHAR(150),
      recorrente_anual BOOLEAN NOT NULL DEFAULT TRUE,
      fonte_origem VARCHAR(100),
      origem_referencia TEXT,
      cor_exibicao VARCHAR(20),
      icone VARCHAR(100),
      prioridade_popup INTEGER NOT NULL DEFAULT 0,
      exibir_no_popup BOOLEAN NOT NULL DEFAULT TRUE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      excluido_logico BOOLEAN NOT NULL DEFAULT FALSE,
      criado_por BIGINT,
      atualizado_por BIGINT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS datas_comemorativas_popup_log (
      id BIGSERIAL PRIMARY KEY,
      usuario_id BIGINT,
      data_referencia DATE NOT NULL,
      evento_id BIGINT,
      exibido_em TIMESTAMP NOT NULL DEFAULT NOW(),
      dispensado BOOLEAN NOT NULL DEFAULT FALSE,
      acao_usuario VARCHAR(50),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS datas_comemorativas_sync_log (
      id BIGSERIAL PRIMARY KEY,
      provider_nome VARCHAR(100) NOT NULL,
      tipo_sync VARCHAR(40) NOT NULL,
      parametros_execucao JSONB,
      quantidade_lidos INTEGER NOT NULL DEFAULT 0,
      quantidade_inseridos INTEGER NOT NULL DEFAULT 0,
      quantidade_atualizados INTEGER NOT NULL DEFAULT 0,
      quantidade_ignorados INTEGER NOT NULL DEFAULT 0,
      quantidade_erros INTEGER NOT NULL DEFAULT 0,
      status_execucao VARCHAR(20) NOT NULL DEFAULT 'sucesso',
      detalhes_erro TEXT,
      iniciado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      finalizado_em TIMESTAMP,
      executado_por BIGINT
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS configuracoes_datas_comemorativas (
      id BIGSERIAL PRIMARY KEY,
      popup_habilitado BOOLEAN NOT NULL DEFAULT TRUE,
      popup_uma_vez_por_dia BOOLEAN NOT NULL DEFAULT TRUE,
      popup_mostrar_feriados BOOLEAN NOT NULL DEFAULT TRUE,
      popup_mostrar_comemorativas BOOLEAN NOT NULL DEFAULT TRUE,
      popup_mostrar_eventos_internos BOOLEAN NOT NULL DEFAULT TRUE,
      popup_limite_itens INTEGER NOT NULL DEFAULT 6,
      popup_ordenar_por_prioridade BOOLEAN NOT NULL DEFAULT TRUE,
      sincronizacao_automatica BOOLEAN NOT NULL DEFAULT FALSE,
      frequencia_sincronizacao VARCHAR(20) NOT NULL DEFAULT 'manual',
      provider_feriado_principal VARCHAR(100) NOT NULL DEFAULT 'brasilapi',
      provider_feriado_fallback VARCHAR(100) NOT NULL DEFAULT 'nager',
      cache_dias INTEGER NOT NULL DEFAULT 30,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      atualizado_por BIGINT,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS datas_comemorativas_auditoria (
      id BIGSERIAL PRIMARY KEY,
      evento_id BIGINT,
      acao VARCHAR(60) NOT NULL,
      detalhes_json JSONB,
      usuario_id BIGINT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_dia_mes_idx
      ON datas_comemorativas (dia, mes);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_data_evento_idx
      ON datas_comemorativas (data_evento);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_tipo_evento_idx
      ON datas_comemorativas (tipo_evento);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_abrangencia_idx
      ON datas_comemorativas (abrangencia);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_uf_idx
      ON datas_comemorativas (uf);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_municipio_idx
      ON datas_comemorativas (municipio);
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_ativo_idx
      ON datas_comemorativas (ativo, excluido_logico);
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS datas_comemorativas_recorrente_unique_idx
      ON datas_comemorativas (
        lower(titulo),
        dia,
        mes,
        tipo_evento,
        abrangencia,
        COALESCE(uf, ''),
        COALESCE(lower(municipio), '')
      )
      WHERE recorrente_anual = TRUE AND excluido_logico = FALSE;
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS datas_comemorativas_pontual_unique_idx
      ON datas_comemorativas (
        lower(titulo),
        data_evento,
        tipo_evento,
        abrangencia,
        COALESCE(uf, ''),
        COALESCE(lower(municipio), '')
      )
      WHERE recorrente_anual = FALSE AND excluido_logico = FALSE;
  `,
  `
    CREATE INDEX IF NOT EXISTS datas_comemorativas_popup_usuario_data_idx
      ON datas_comemorativas_popup_log (usuario_id, data_referencia);
  `,
  `
    INSERT INTO configuracoes_datas_comemorativas (
      id,
      popup_habilitado,
      popup_uma_vez_por_dia,
      popup_mostrar_feriados,
      popup_mostrar_comemorativas,
      popup_mostrar_eventos_internos,
      popup_limite_itens,
      popup_ordenar_por_prioridade,
      sincronizacao_automatica,
      frequencia_sincronizacao,
      provider_feriado_principal,
      provider_feriado_fallback,
      cache_dias,
      ativo,
      atualizado_em
    )
    VALUES (1, TRUE, TRUE, TRUE, TRUE, TRUE, 6, TRUE, FALSE, 'manual', 'brasilapi', 'nager', 30, TRUE, NOW())
    ON CONFLICT (id) DO NOTHING;
  `,
  `
    INSERT INTO permissao (nome)
    VALUES
      ${permissoesModulo.map((item) => `('${item}')`).join(",\n      ")}
    ON CONFLICT (nome) DO NOTHING;
  `,
  `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT DISTINCT admin.usuario_id, permissao_nova.id
    FROM usuario_permissao admin
    INNER JOIN permissao permissao_admin
      ON permissao_admin.id = admin.permissao_id
     AND permissao_admin.nome = 'ADMINISTRADOR'
    CROSS JOIN permissao permissao_nova
    WHERE permissao_nova.nome IN (${permissoesModulo.map((item) => `'${item}'`).join(", ")})
    ON CONFLICT DO NOTHING;
  `
];

const defaultConfig: DataComemorativaConfig = {
  popupHabilitado: true,
  popupUmaVezPorDia: true,
  popupMostrarFeriados: true,
  popupMostrarComemorativas: true,
  popupMostrarEventosInternos: true,
  popupLimiteItens: 6,
  popupOrdenarPorPrioridade: true,
  sincronizacaoAutomatica: false,
  frequenciaSincronizacao: "manual",
  providerFeriadoPrincipal: "brasilapi",
  providerFeriadoFallback: "nager",
  cacheDias: 30,
  ativo: true
};

let ensurePromise: Promise<void> | null = null;

function parseBooleanString(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;
  return undefined;
}

function normalizarMunicipio(value?: string | null) {
  return trimOrUndefined(value);
}

function mapConfigRow(row?: Record<string, unknown> | null): DataComemorativaConfig {
  if (!row) return defaultConfig;
  return {
    popupHabilitado: Boolean(row.popup_habilitado),
    popupUmaVezPorDia: Boolean(row.popup_uma_vez_por_dia),
    popupMostrarFeriados: Boolean(row.popup_mostrar_feriados),
    popupMostrarComemorativas: Boolean(row.popup_mostrar_comemorativas),
    popupMostrarEventosInternos: Boolean(row.popup_mostrar_eventos_internos),
    popupLimiteItens: Number(row.popup_limite_itens ?? defaultConfig.popupLimiteItens),
    popupOrdenarPorPrioridade: Boolean(row.popup_ordenar_por_prioridade),
    sincronizacaoAutomatica: Boolean(row.sincronizacao_automatica),
    frequenciaSincronizacao: String(
      row.frequencia_sincronizacao ?? defaultConfig.frequenciaSincronizacao
    ) as DataComemorativaConfig["frequenciaSincronizacao"],
    providerFeriadoPrincipal: String(
      row.provider_feriado_principal ?? defaultConfig.providerFeriadoPrincipal
    ),
    providerFeriadoFallback: String(
      row.provider_feriado_fallback ?? defaultConfig.providerFeriadoFallback
    ),
    cacheDias: Number(row.cache_dias ?? defaultConfig.cacheDias),
    ativo: Boolean(row.ativo)
  };
}

function montarDataVisual(row: DataComemorativaRow, year?: number) {
  if (row.data_evento) {
    return row.data_evento.toISOString().slice(0, 10);
  }
  const ano = year ?? new Date().getFullYear();
  return `${ano}-${String(row.mes).padStart(2, "0")}-${String(row.dia).padStart(2, "0")}`;
}

function buildWhere(
  filters: DataComemorativaFilters,
  options?: { contexto?: DataComemorativaContexto; date?: string; month?: number; year?: number }
) {
  const params: unknown[] = [];
  const parts: string[] = ["excluido_logico = FALSE"];

  const push = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.termo?.trim()) {
    const term = `%${filters.termo.trim()}%`;
    const param = push(term);
    parts.push(`(titulo ILIKE ${param} OR COALESCE(descricao, '') ILIKE ${param})`);
  }

  if (filters.tipoEvento?.trim()) {
    parts.push(`tipo_evento = ${push(filters.tipoEvento.trim())}`);
  }

  if (filters.abrangencia?.trim()) {
    parts.push(`abrangencia = ${push(filters.abrangencia.trim())}`);
  }

  if (filters.uf?.trim()) {
    parts.push(`COALESCE(uf, '') = ${push(filters.uf.trim().toUpperCase())}`);
  }

  if (filters.municipio?.trim()) {
    parts.push(`COALESCE(municipio, '') ILIKE ${push(filters.municipio.trim())}`);
  }

  const ativo = parseBooleanString(filters.ativo);
  if (ativo !== undefined) {
    parts.push(`ativo = ${push(ativo)}`);
  }

  const exibirNoPopup = parseBooleanString(filters.exibirNoPopup);
  if (exibirNoPopup !== undefined) {
    parts.push(`exibir_no_popup = ${push(exibirNoPopup)}`);
  }

  if (filters.origem?.trim()) {
    parts.push(`COALESCE(fonte_origem, '') = ${push(filters.origem.trim())}`);
  }

  if (options?.date) {
    const dateParam = push(options.date);
    parts.push(`
      (
        (recorrente_anual = TRUE AND dia = EXTRACT(DAY FROM ${dateParam}::date) AND mes = EXTRACT(MONTH FROM ${dateParam}::date))
        OR
        (recorrente_anual = FALSE AND data_evento = ${dateParam}::date)
      )
    `);
  } else if (options?.month && options?.year) {
    const yearParam = push(options.year);
    const monthParam = push(options.month);
    parts.push(`
      (
        (recorrente_anual = TRUE AND mes = ${monthParam})
        OR
        (
          recorrente_anual = FALSE
          AND EXTRACT(YEAR FROM data_evento) = ${yearParam}
          AND EXTRACT(MONTH FROM data_evento) = ${monthParam}
        )
      )
    `);
  }

  if (options?.contexto?.uf?.trim()) {
    const ufParam = push(options.contexto.uf.trim().toUpperCase());
    if (options.contexto.municipio?.trim()) {
      const municipioParam = push(options.contexto.municipio.trim());
      parts.push(`
        (
          abrangencia IN ('nacional', 'interna')
          OR (abrangencia = 'estadual' AND uf = ${ufParam})
          OR (abrangencia = 'municipal' AND uf = ${ufParam} AND municipio ILIKE ${municipioParam})
        )
      `);
    } else {
      parts.push(`
        (
          abrangencia IN ('nacional', 'interna')
          OR (abrangencia = 'estadual' AND uf = ${ufParam})
        )
      `);
    }
  }

  return {
    whereSql: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params
  };
}

function buildOrder(filters: DataComemorativaFilters, options?: { year?: number }) {
  const campo = filters.ordenarPor?.trim() || "data";
  const direcao = filters.ordem?.trim()?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  if (campo === "titulo") return `ORDER BY titulo ${direcao}, id DESC`;
  if (campo === "tipo_evento") return `ORDER BY tipo_evento ${direcao}, titulo ASC`;
  if (campo === "abrangencia") return `ORDER BY abrangencia ${direcao}, titulo ASC`;

  const ano = options?.year ?? new Date().getFullYear();
  return `
    ORDER BY
      CASE
        WHEN recorrente_anual = TRUE THEN MAKE_DATE(${ano}, mes, dia)
        ELSE data_evento
      END ${direcao},
      prioridade_popup DESC,
      titulo ASC
  `;
}

export async function ensureDatasComemorativasEstrutura() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const sql of sqlEstrutura) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }

  await ensurePromise;
}

export class DatasComemorativasRepository {
  private async ensureEstrutura() {
    await ensureDatasComemorativasEstrutura();
  }

  async listar(filters: DataComemorativaFilters): Promise<ListaResultado> {
    await this.ensureEstrutura();
    const pagina = Math.max(Number(filters.pagina ?? 1) || 1, 1);
    const limite = Math.min(Math.max(Number(filters.limite ?? 20) || 20, 1), 200);
    const offset = (pagina - 1) * limite;
    const year = Number(filters.ano ?? new Date().getFullYear()) || new Date().getFullYear();
    const { whereSql, params } = buildWhere(filters);
    const orderSql = buildOrder(filters, { year });

    const totalRows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
      `
        SELECT COUNT(*)::BIGINT AS total
        FROM datas_comemorativas
        ${whereSql}
      `,
      ...params
    );

    const rows = await prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        ${whereSql}
        ${orderSql}
        LIMIT ${limite}
        OFFSET ${offset}
      `,
      ...params
    );

    return {
      rows,
      total: Number(totalRows[0]?.total ?? 0)
    };
  }

  async listarParaExportacao(filters: DataComemorativaFilters) {
    await this.ensureEstrutura();
    const year = Number(filters.ano ?? new Date().getFullYear()) || new Date().getFullYear();
    const { whereSql, params } = buildWhere(filters);
    const orderSql = buildOrder(filters, { year });
    return prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        ${whereSql}
        ${orderSql}
      `,
      ...params
    );
  }

  async buscarPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        WHERE id = $1
          AND excluido_logico = FALSE
        LIMIT 1
      `,
      id
    );
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const row = await this.buscarPorId(id);
    if (!row) {
      throw new AppError("Evento não encontrado.", 404);
    }
    return row;
  }

  async buscarDuplicidade(input: DataComemorativaInput, ignoreId?: bigint | null) {
    await this.ensureEstrutura();
    const titulo = input.titulo.trim().toLowerCase();
    const uf = input.uf?.trim().toUpperCase() ?? "";
    const municipio = normalizarMunicipio(input.municipio)?.toLowerCase() ?? "";

    if (input.recorrenteAnual !== false) {
      const rows = await prisma.$queryRawUnsafe<DataComemorativaRow[]>(
        `
          SELECT *
          FROM datas_comemorativas
          WHERE lower(titulo) = $1
            AND dia = $2
            AND mes = $3
            AND tipo_evento = $4
            AND abrangencia = $5
            AND COALESCE(uf, '') = $6
            AND COALESCE(lower(municipio), '') = $7
            AND excluido_logico = FALSE
            ${ignoreId ? "AND id <> $8" : ""}
          LIMIT 1
        `,
        ...(ignoreId
          ? [titulo, input.dia ?? 0, input.mes ?? 0, input.tipoEvento, input.abrangencia, uf, municipio, ignoreId]
          : [titulo, input.dia ?? 0, input.mes ?? 0, input.tipoEvento, input.abrangencia, uf, municipio])
      );
      return rows[0] ?? null;
    }

    const rows = await prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        WHERE lower(titulo) = $1
          AND data_evento = $2::date
          AND tipo_evento = $3
          AND abrangencia = $4
          AND COALESCE(uf, '') = $5
          AND COALESCE(lower(municipio), '') = $6
          AND excluido_logico = FALSE
          ${ignoreId ? "AND id <> $7" : ""}
        LIMIT 1
      `,
      ...(ignoreId
        ? [titulo, input.dataEvento, input.tipoEvento, input.abrangencia, uf, municipio, ignoreId]
        : [titulo, input.dataEvento, input.tipoEvento, input.abrangencia, uf, municipio])
    );

    return rows[0] ?? null;
  }

  async criar(input: DataComemorativaInput, usuarioId?: bigint | null) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
      `
        INSERT INTO datas_comemorativas (
          titulo,
          descricao,
          dia,
          mes,
          ano,
          data_evento,
          tipo_evento,
          abrangencia,
          uf,
          municipio,
          recorrente_anual,
          fonte_origem,
          origem_referencia,
          cor_exibicao,
          icone,
          prioridade_popup,
          exibir_no_popup,
          ativo,
          excluido_logico,
          criado_por,
          atualizado_por,
          criado_em,
          atualizado_em
        ) VALUES (
          $1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, FALSE, $19, $19, NOW(), NOW()
        )
        RETURNING id
      `,
      input.titulo.trim(),
      trimOrUndefined(input.descricao) ?? null,
      input.dia ?? 0,
      input.mes ?? 0,
      input.ano ?? null,
      input.dataEvento ?? null,
      input.tipoEvento,
      input.abrangencia,
      input.uf?.trim().toUpperCase() ?? null,
      normalizarMunicipio(input.municipio) ?? null,
      input.recorrenteAnual !== false,
      trimOrUndefined(input.fonteOrigem) ?? "manual",
      trimOrUndefined(input.origemReferencia) ?? null,
      trimOrUndefined(input.corExibicao) ?? null,
      trimOrUndefined(input.icone) ?? null,
      Number(input.prioridadePopup ?? 0),
      input.exibirNoPopup !== false,
      input.ativo !== false,
      usuarioId ?? null
    );

    const id = rows[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o evento.", 500);
    }
    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: DataComemorativaInput, usuarioId?: bigint | null) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRawUnsafe(
      `
        UPDATE datas_comemorativas
        SET
          titulo = $1,
          descricao = $2,
          dia = $3,
          mes = $4,
          ano = $5,
          data_evento = $6::date,
          tipo_evento = $7,
          abrangencia = $8,
          uf = $9,
          municipio = $10,
          recorrente_anual = $11,
          fonte_origem = $12,
          origem_referencia = $13,
          cor_exibicao = $14,
          icone = $15,
          prioridade_popup = $16,
          exibir_no_popup = $17,
          ativo = $18,
          atualizado_por = $19,
          atualizado_em = NOW()
        WHERE id = $20
      `,
      input.titulo.trim(),
      trimOrUndefined(input.descricao) ?? null,
      input.dia ?? 0,
      input.mes ?? 0,
      input.ano ?? null,
      input.dataEvento ?? null,
      input.tipoEvento,
      input.abrangencia,
      input.uf?.trim().toUpperCase() ?? null,
      normalizarMunicipio(input.municipio) ?? null,
      input.recorrenteAnual !== false,
      trimOrUndefined(input.fonteOrigem) ?? "manual",
      trimOrUndefined(input.origemReferencia) ?? null,
      trimOrUndefined(input.corExibicao) ?? null,
      trimOrUndefined(input.icone) ?? null,
      Number(input.prioridadePopup ?? 0),
      input.exibirNoPopup !== false,
      input.ativo !== false,
      usuarioId ?? null,
      id
    );
    return this.buscarPorIdOuFalhar(id);
  }

  async excluirLogico(id: bigint, usuarioId?: bigint | null) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRawUnsafe(
      `
        UPDATE datas_comemorativas
        SET
          excluido_logico = TRUE,
          ativo = FALSE,
          atualizado_por = $1,
          atualizado_em = NOW()
        WHERE id = $2
      `,
      usuarioId ?? null,
      id
    );
  }

  async alterarAtivo(id: bigint, ativo: boolean, usuarioId?: bigint | null) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRawUnsafe(
      `
        UPDATE datas_comemorativas
        SET
          ativo = $1,
          atualizado_por = $2,
          atualizado_em = NOW()
        WHERE id = $3
      `,
      ativo,
      usuarioId ?? null,
      id
    );
    return this.buscarPorIdOuFalhar(id);
  }

  async listarPorData(data: string, contexto?: DataComemorativaContexto, somentePopup = false) {
    await this.ensureEstrutura();
    const filters: DataComemorativaFilters = {};
    if (somentePopup) {
      filters.exibirNoPopup = "true";
      filters.ativo = "true";
    }
    const { whereSql, params } = buildWhere(filters, { date: data, contexto });
    return prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        ${whereSql}
        ORDER BY prioridade_popup DESC, titulo ASC
      `,
      ...params
    );
  }

  async listarPorMes(
    year: number,
    month: number,
    filters: DataComemorativaFilters,
    contexto?: DataComemorativaContexto
  ) {
    await this.ensureEstrutura();
    const { whereSql, params } = buildWhere(filters, { year, month, contexto });
    return prisma.$queryRawUnsafe<DataComemorativaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas
        ${whereSql}
        ORDER BY prioridade_popup DESC, titulo ASC
      `,
      ...params
    );
  }

  async salvarImportado(item: DataComemorativaImportItem, usuarioId?: bigint | null) {
    const existente = await this.buscarDuplicidade(item);
    if (!existente) {
      const criado = await this.criar(
        {
          ...item,
          fonteOrigem: item.providerNome ?? item.fonteOrigem ?? "importacao"
        },
        usuarioId
      );
      return { registro: criado, acao: "inserido" as const };
    }

    const atualizado = await this.atualizar(
      existente.id,
      {
        ...item,
        fonteOrigem: item.providerNome ?? item.fonteOrigem ?? existente.fonte_origem ?? "importacao",
        corExibicao: item.corExibicao ?? existente.cor_exibicao,
        icone: item.icone ?? existente.icone,
        prioridadePopup: item.prioridadePopup ?? existente.prioridade_popup ?? 0,
        exibirNoPopup: item.exibirNoPopup ?? existente.exibir_no_popup,
        ativo: item.ativo ?? existente.ativo
      },
      usuarioId
    );
    return { registro: atualizado, acao: "atualizado" as const };
  }

  async removerSeedCorrompido() {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
        DELETE FROM datas_comemorativas
        WHERE fonte_origem = 'seed'
          AND (
            titulo LIKE '%Ã%'
            OR titulo LIKE '%Â%'
            OR titulo LIKE '%�%'
          )
      `
    );
  }

  async removerDuplicidadesLogicas() {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<Array<{ total_removido: number | bigint }>>(
      `
        WITH ranqueados AS (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY
                LOWER(TRIM(titulo)),
                dia,
                mes,
                COALESCE(data_evento, DATE '0001-01-01'),
                tipo_evento,
                abrangencia,
                COALESCE(uf, ''),
                COALESCE(LOWER(municipio), '')
              ORDER BY
                CASE
                  WHEN COALESCE(fonte_origem, '') = 'manual' THEN 0
                  WHEN COALESCE(fonte_origem, '') LIKE 'importacao%' THEN 1
                  WHEN COALESCE(fonte_origem, '') LIKE 'api_%' THEN 2
                  WHEN COALESCE(fonte_origem, '') IN ('brasilapi', 'nager') THEN 2
                  WHEN COALESCE(fonte_origem, '') = 'seed' THEN 3
                  ELSE 4
                END ASC,
                atualizado_em DESC,
                criado_em DESC,
                id DESC
            ) AS ordem
          FROM datas_comemorativas
          WHERE excluido_logico = FALSE
        ),
        removidos AS (
          DELETE FROM datas_comemorativas
          WHERE id IN (
            SELECT id
            FROM ranqueados
            WHERE ordem > 1
          )
          RETURNING id
        )
        SELECT COUNT(*)::int AS total_removido
        FROM removidos
      `
    );

    return Number(rows[0]?.total_removido ?? 0);
  }

  async buscarConfiguracoes() {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `
        SELECT *
        FROM configuracoes_datas_comemorativas
        WHERE id = 1
        LIMIT 1
      `
    );
    return mapConfigRow(rows[0] ?? null);
  }

  async salvarConfiguracoes(input: Partial<DataComemorativaConfig>, usuarioId?: bigint | null) {
    await this.ensureEstrutura();
    const atual = await this.buscarConfiguracoes();
    const merged = {
      ...atual,
      ...input
    };

    await prisma.$executeRawUnsafe(
      `
        UPDATE configuracoes_datas_comemorativas
        SET
          popup_habilitado = $1,
          popup_uma_vez_por_dia = $2,
          popup_mostrar_feriados = $3,
          popup_mostrar_comemorativas = $4,
          popup_mostrar_eventos_internos = $5,
          popup_limite_itens = $6,
          popup_ordenar_por_prioridade = $7,
          sincronizacao_automatica = $8,
          frequencia_sincronizacao = $9,
          provider_feriado_principal = $10,
          provider_feriado_fallback = $11,
          cache_dias = $12,
          ativo = $13,
          atualizado_por = $14,
          atualizado_em = NOW()
        WHERE id = 1
      `,
      merged.popupHabilitado,
      merged.popupUmaVezPorDia,
      merged.popupMostrarFeriados,
      merged.popupMostrarComemorativas,
      merged.popupMostrarEventosInternos,
      merged.popupLimiteItens,
      merged.popupOrdenarPorPrioridade,
      merged.sincronizacaoAutomatica,
      merged.frequenciaSincronizacao,
      merged.providerFeriadoPrincipal,
      merged.providerFeriadoFallback,
      merged.cacheDias,
      merged.ativo,
      usuarioId ?? null
    );

    return this.buscarConfiguracoes();
  }

  async iniciarSyncLog(input: DataComemorativaSyncStartInput) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
      `
        INSERT INTO datas_comemorativas_sync_log (
          provider_nome,
          tipo_sync,
          parametros_execucao,
          status_execucao,
          iniciado_em,
          executado_por
        ) VALUES ($1, $2, $3::jsonb, 'sucesso', NOW(), $4)
        RETURNING id
      `,
      input.providerNome,
      input.tipoSync,
      JSON.stringify(input.parametrosExecucao ?? {}),
      input.executadoPor ?? null
    );
    return rows[0]?.id ?? BigInt(0);
  }

  async finalizarSyncLog(input: DataComemorativaSyncFinishInput) {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
        UPDATE datas_comemorativas_sync_log
        SET
          quantidade_lidos = $1,
          quantidade_inseridos = $2,
          quantidade_atualizados = $3,
          quantidade_ignorados = $4,
          quantidade_erros = $5,
          status_execucao = $6,
          detalhes_erro = $7,
          finalizado_em = NOW()
        WHERE id = $8
      `,
      input.quantidadeLidos,
      input.quantidadeInseridos,
      input.quantidadeAtualizados,
      input.quantidadeIgnorados,
      input.quantidadeErros,
      input.statusExecucao,
      input.detalhesErro ?? null,
      input.logId
    );
  }

  async listarSyncLogs() {
    await this.ensureEstrutura();
    return prisma.$queryRawUnsafe<DataComemorativaSyncLogRow[]>(
      `
        SELECT *
        FROM datas_comemorativas_sync_log
        ORDER BY iniciado_em DESC
        LIMIT 120
      `
    );
  }

  async listarPopupLogs(usuarioId?: bigint | null) {
    await this.ensureEstrutura();
    return prisma.$queryRawUnsafe<DataComemorativaPopupLogRow[]>(
      `
        SELECT *
        FROM datas_comemorativas_popup_log
        ${usuarioId ? "WHERE usuario_id = $1" : ""}
        ORDER BY criado_em DESC
        LIMIT 120
      `,
      ...(usuarioId ? [usuarioId] : [])
    );
  }

  async listarAuditoria() {
    await this.ensureEstrutura();
    return prisma.$queryRawUnsafe<DataComemorativaAuditoriaRow[]>(
      `
        SELECT *
        FROM datas_comemorativas_auditoria
        ORDER BY criado_em DESC
        LIMIT 200
      `
    );
  }

  async registrarAuditoria(
    acao: string,
    detalhes: Record<string, unknown>,
    usuarioId?: bigint | null,
    eventoId?: bigint | null
  ) {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO datas_comemorativas_auditoria (
          evento_id,
          acao,
          detalhes_json,
          usuario_id,
          criado_em
        ) VALUES ($1, $2, $3::jsonb, $4, NOW())
      `,
      eventoId ?? null,
      acao,
      JSON.stringify(detalhes),
      usuarioId ?? null
    );
  }

  async jaRegistrouPopupNoDia(usuarioId: bigint, data: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint | number }>>(
      `
        SELECT COUNT(*)::BIGINT AS total
        FROM datas_comemorativas_popup_log
        WHERE usuario_id = $1
          AND data_referencia = $2::date
      `,
      usuarioId,
      data
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async registrarPopupVisualizacao(
    usuarioId: bigint,
    data: string,
    eventIds: string[],
    acao?: string | null,
    dispensado = false
  ) {
    await this.ensureEstrutura();
    if (!eventIds.length) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO datas_comemorativas_popup_log (
            usuario_id,
            data_referencia,
            evento_id,
            exibido_em,
            dispensado,
            acao_usuario,
            criado_em
          ) VALUES ($1, $2::date, NULL, NOW(), $3, $4, NOW())
        `,
        usuarioId,
        data,
        dispensado,
        acao ?? null
      );
      return;
    }

    for (const eventId of eventIds) {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO datas_comemorativas_popup_log (
            usuario_id,
            data_referencia,
            evento_id,
            exibido_em,
            dispensado,
            acao_usuario,
            criado_em
          ) VALUES ($1, $2::date, $3, NOW(), $4, $5, NOW())
        `,
        usuarioId,
        data,
        BigInt(eventId),
        dispensado,
        acao ?? null
      );
    }
  }

  async listarLogsConsolidados(): Promise<DataComemorativaLogItem[]> {
    const [syncLogs, auditLogs, popupLogs] = await Promise.all([
      this.listarSyncLogs(),
      this.listarAuditoria(),
      this.listarPopupLogs()
    ]);

    const itens: DataComemorativaLogItem[] = [
      ...syncLogs.map((item) => ({
        id: `sync-${toStringId(item.id)}`,
        origem: "sincronizacao" as const,
        titulo: `Sincronização ${item.tipo_sync}`,
        descricao: `${item.provider_nome} • lidos ${Number(item.quantidade_lidos ?? 0)} • inseridos ${Number(item.quantidade_inseridos ?? 0)} • atualizados ${Number(item.quantidade_atualizados ?? 0)}`,
        usuarioId: item.executado_por ? toStringId(item.executado_por) : undefined,
        criadoEm: item.iniciado_em.toISOString(),
        status: item.status_execucao
      })),
      ...auditLogs.map((item) => ({
        id: `audit-${toStringId(item.id)}`,
        origem: "auditoria" as const,
        titulo: item.acao,
        descricao: JSON.stringify(item.detalhes_json ?? {}),
        usuarioId: item.usuario_id ? toStringId(item.usuario_id) : undefined,
        criadoEm: item.criado_em.toISOString()
      })),
      ...popupLogs.map((item) => ({
        id: `popup-${toStringId(item.id)}`,
        origem: "popup" as const,
        titulo: item.dispensado ? "Popup dispensado" : "Popup exibido",
        descricao: item.acao_usuario ?? "visualizacao",
        usuarioId: item.usuario_id ? toStringId(item.usuario_id) : undefined,
        criadoEm: item.criado_em.toISOString(),
        status: item.dispensado ? "dispensado" : "exibido"
      }))
    ];

    return itens.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  }

  async duplicar(id: bigint, usuarioId?: bigint | null) {
    const atual = await this.buscarPorIdOuFalhar(id);
    const sufixo = atual.recorrente_anual ? " (cópia)" : ` (${new Date().getFullYear()})`;
    return this.criar(
      {
        titulo: `${atual.titulo}${sufixo}`.slice(0, 255),
        descricao: atual.descricao,
        dia: atual.dia,
        mes: atual.mes,
        ano: atual.ano,
        dataEvento: atual.data_evento ? atual.data_evento.toISOString().slice(0, 10) : null,
        tipoEvento: atual.tipo_evento,
        abrangencia: atual.abrangencia,
        uf: atual.uf,
        municipio: atual.municipio,
        recorrenteAnual: atual.recorrente_anual,
        fonteOrigem: "manual",
        origemReferencia: atual.origem_referencia,
        corExibicao: atual.cor_exibicao,
        icone: atual.icone,
        prioridadePopup: atual.prioridade_popup,
        exibirNoPopup: atual.exibir_no_popup,
        ativo: atual.ativo
      },
      usuarioId
    );
  }

  mapDataVisual(row: DataComemorativaRow, year?: number) {
    return montarDataVisual(row, year);
  }
}
