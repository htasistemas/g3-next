import { prisma } from "../../../database/prisma.js";
import type {
  AtualizacaoSistemaConfig,
  AtualizacaoSistemaHistoricoItem,
  AtualizacaoSistemaLogItem,
  AtualizacaoSistemaModo,
  AtualizacaoSistemaStatus
} from "../atualizacao-sistema.types.js";

type RegistroConfigRow = {
  modo: AtualizacaoSistemaModo;
  atualizado_em: Date;
  atualizado_por: string | null;
};

type RegistroStatusRow = {
  modo: AtualizacaoSistemaModo;
  versao_instalada: string | null;
  versao_publicada: string | null;
  atualizacao_disponivel: boolean;
  em_execucao: boolean;
  status: string;
  mensagem: string | null;
  progresso: number;
  execucao_id: string | null;
  ultima_verificacao_em: Date | null;
  ultima_atualizacao_em: Date | null;
  responsavel_ultima_atualizacao: string | null;
  usuario_execucao: string | null;
  iniciado_em: Date | null;
  finalizado_em: Date | null;
};

type RegistroHistoricoRow = {
  id: bigint;
  execucao_id: string;
  versao_anterior: string | null;
  versao_nova: string | null;
  modo: AtualizacaoSistemaModo;
  usuario_responsavel: string | null;
  data_hora: Date;
  duracao_ms: bigint | number | null;
  status: string;
  detalhes_json: unknown;
  backup_diretorio: string | null;
  rollback_disponivel: boolean;
  rollback_executado_em: Date | null;
};

type RegistroLogRow = {
  id: bigint;
  execucao_id: string;
  nivel: "INFO" | "WARN" | "ERROR";
  etapa: string;
  mensagem: string;
  detalhes_json: unknown;
  criado_em: Date;
};

const sqlEstruturaAtualizacaoSistema = [
  `
    CREATE TABLE IF NOT EXISTS atualizacao_sistema_config (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      modo VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
      atualizado_por VARCHAR(120),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT atualizacao_sistema_config_single_ck CHECK (id = 1),
      CONSTRAINT atualizacao_sistema_config_modo_ck CHECK (modo IN ('MANUAL', 'AUTOMATICO'))
    )
  `,
  `
    INSERT INTO atualizacao_sistema_config (id, modo, atualizado_por, atualizado_em)
    VALUES (1, 'MANUAL', 'sistema', NOW())
    ON CONFLICT (id) DO NOTHING
  `,
  `
    CREATE TABLE IF NOT EXISTS atualizacao_sistema_status (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      versao_instalada VARCHAR(40),
      versao_publicada VARCHAR(40),
      atualizacao_disponivel BOOLEAN NOT NULL DEFAULT FALSE,
      em_execucao BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(40) NOT NULL DEFAULT 'IDLE',
      mensagem TEXT,
      progresso INTEGER NOT NULL DEFAULT 0,
      execucao_id VARCHAR(120),
      ultima_verificacao_em TIMESTAMP,
      ultima_atualizacao_em TIMESTAMP,
      responsavel_ultima_atualizacao VARCHAR(120),
      usuario_execucao VARCHAR(120),
      iniciado_em TIMESTAMP,
      finalizado_em TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT atualizacao_sistema_status_single_ck CHECK (id = 1)
    )
  `,
  `
    INSERT INTO atualizacao_sistema_status (
      id,
      versao_instalada,
      versao_publicada,
      atualizacao_disponivel,
      em_execucao,
      status,
      mensagem,
      progresso,
      atualizado_em
    )
    VALUES (1, NULL, NULL, FALSE, FALSE, 'IDLE', NULL, 0, NOW())
    ON CONFLICT (id) DO NOTHING
  `,
  `
    CREATE TABLE IF NOT EXISTS atualizacao_sistema_historico (
      id BIGSERIAL PRIMARY KEY,
      execucao_id VARCHAR(120) NOT NULL,
      versao_anterior VARCHAR(40),
      versao_nova VARCHAR(40),
      modo VARCHAR(20) NOT NULL,
      usuario_responsavel VARCHAR(120),
      data_hora TIMESTAMP NOT NULL DEFAULT NOW(),
      duracao_ms BIGINT,
      status VARCHAR(40) NOT NULL,
      detalhes_json JSONB,
      backup_diretorio TEXT,
      rollback_disponivel BOOLEAN NOT NULL DEFAULT FALSE,
      rollback_executado_em TIMESTAMP
    )
  `,
  "CREATE INDEX IF NOT EXISTS atualizacao_sistema_historico_data_idx ON atualizacao_sistema_historico(data_hora DESC)",
  "CREATE INDEX IF NOT EXISTS atualizacao_sistema_historico_execucao_idx ON atualizacao_sistema_historico(execucao_id)",
  `
    CREATE TABLE IF NOT EXISTS atualizacao_sistema_logs (
      id BIGSERIAL PRIMARY KEY,
      execucao_id VARCHAR(120) NOT NULL,
      nivel VARCHAR(20) NOT NULL,
      etapa VARCHAR(80) NOT NULL,
      mensagem TEXT NOT NULL,
      detalhes_json JSONB,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "CREATE INDEX IF NOT EXISTS atualizacao_sistema_logs_execucao_idx ON atualizacao_sistema_logs(execucao_id, criado_em DESC)"
] as const;

let estruturaPromise: Promise<void> | null = null;

function parseDetalhes(
  valor: unknown
): Record<string, unknown> | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return null;
  }

  return valor as Record<string, unknown>;
}

function toStatusResponse(
  row: RegistroStatusRow,
  modo: AtualizacaoSistemaModo
): AtualizacaoSistemaStatus {
  return {
    modo,
    versaoInstalada: row.versao_instalada ?? "",
    versaoPublicada: row.versao_publicada,
    atualizacaoDisponivel: Boolean(row.atualizacao_disponivel),
    emExecucao: Boolean(row.em_execucao),
    status: row.status,
    mensagem: row.mensagem,
    progresso: Number(row.progresso ?? 0),
    execucaoId: row.execucao_id,
    ultimaVerificacaoEm: row.ultima_verificacao_em?.toISOString() ?? null,
    ultimaAtualizacaoEm: row.ultima_atualizacao_em?.toISOString() ?? null,
    responsavelUltimaAtualizacao: row.responsavel_ultima_atualizacao,
    usuarioExecucao: row.usuario_execucao,
    iniciadoEm: row.iniciado_em?.toISOString() ?? null,
    finalizadoEm: row.finalizado_em?.toISOString() ?? null
  };
}

function toHistoricoResponse(row: RegistroHistoricoRow): AtualizacaoSistemaHistoricoItem {
  return {
    id: row.id.toString(),
    execucaoId: row.execucao_id,
    versaoAnterior: row.versao_anterior,
    versaoNova: row.versao_nova,
    modo: row.modo,
    usuarioResponsavel: row.usuario_responsavel,
    dataHora: row.data_hora.toISOString(),
    duracaoMs:
      typeof row.duracao_ms === "bigint"
        ? Number(row.duracao_ms)
        : typeof row.duracao_ms === "number"
          ? row.duracao_ms
          : null,
    status: row.status,
    detalhes: parseDetalhes(row.detalhes_json),
    backupDiretorio: row.backup_diretorio,
    rollbackDisponivel: Boolean(row.rollback_disponivel),
    rollbackExecutadoEm: row.rollback_executado_em?.toISOString() ?? null
  };
}

function toLogResponse(row: RegistroLogRow): AtualizacaoSistemaLogItem {
  return {
    id: row.id.toString(),
    execucaoId: row.execucao_id,
    nivel: row.nivel,
    etapa: row.etapa,
    mensagem: row.mensagem,
    detalhes: parseDetalhes(row.detalhes_json),
    criadoEm: row.criado_em.toISOString()
  };
}

export class AtualizacaoSistemaRepository {
  private async ensureEstrutura() {
    await ensureAtualizacaoSistemaEstrutura();
  }

  async obterConfig() {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<RegistroConfigRow[]>(
      `
        SELECT modo, atualizado_em, atualizado_por
        FROM atualizacao_sistema_config
        WHERE id = 1
        LIMIT 1
      `
    );

    return {
      modo: rows[0]?.modo ?? "MANUAL"
    } satisfies AtualizacaoSistemaConfig;
  }

  async salvarConfig(modo: AtualizacaoSistemaModo, usuarioAtualizacao: string) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO atualizacao_sistema_config (id, modo, atualizado_por, atualizado_em)
        VALUES (1, $1, $2, NOW())
        ON CONFLICT (id) DO UPDATE
        SET modo = EXCLUDED.modo,
            atualizado_por = EXCLUDED.atualizado_por,
            atualizado_em = NOW()
      `,
      modo,
      usuarioAtualizacao
    );

    return this.obterConfig();
  }

  async obterStatus() {
    await this.ensureEstrutura();
    const [config, rows] = await Promise.all([
      this.obterConfig(),
      prisma.$queryRawUnsafe<RegistroStatusRow[]>(
        `
          SELECT
            versao_instalada,
            versao_publicada,
            atualizacao_disponivel,
            em_execucao,
            status,
            mensagem,
            progresso,
            execucao_id,
            ultima_verificacao_em,
            ultima_atualizacao_em,
            responsavel_ultima_atualizacao,
            usuario_execucao,
            iniciado_em,
            finalizado_em
          FROM atualizacao_sistema_status
          WHERE id = 1
          LIMIT 1
        `
      )
    ]);

    const row =
      rows[0] ??
      ({
        modo: config.modo,
        versao_instalada: null,
        versao_publicada: null,
        atualizacao_disponivel: false,
        em_execucao: false,
        status: "IDLE",
        mensagem: null,
        progresso: 0,
        execucao_id: null,
        ultima_verificacao_em: null,
        ultima_atualizacao_em: null,
        responsavel_ultima_atualizacao: null,
        usuario_execucao: null,
        iniciado_em: null,
        finalizado_em: null
      } satisfies RegistroStatusRow);

    return toStatusResponse(row, config.modo);
  }

  async atualizarStatus(input: {
    versaoInstalada?: string | null;
    versaoPublicada?: string | null;
    atualizacaoDisponivel?: boolean;
    emExecucao?: boolean;
    status?: string;
    mensagem?: string | null;
    progresso?: number;
    execucaoId?: string | null;
    ultimaVerificacaoEm?: Date | null;
    ultimaAtualizacaoEm?: Date | null;
    responsavelUltimaAtualizacao?: string | null;
    usuarioExecucao?: string | null;
    iniciadoEm?: Date | null;
    finalizadoEm?: Date | null;
  }) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        UPDATE atualizacao_sistema_status
        SET
          versao_instalada = COALESCE($1, versao_instalada),
          versao_publicada = COALESCE($2, versao_publicada),
          atualizacao_disponivel = COALESCE($3, atualizacao_disponivel),
          em_execucao = COALESCE($4, em_execucao),
          status = COALESCE($5, status),
          mensagem = CASE WHEN $6::text = '__G3_KEEP__' THEN mensagem ELSE $6 END,
          progresso = COALESCE($7, progresso),
          execucao_id = CASE WHEN $8::text = '__G3_KEEP__' THEN execucao_id ELSE $8 END,
          ultima_verificacao_em = COALESCE($9, ultima_verificacao_em),
          ultima_atualizacao_em = COALESCE($10, ultima_atualizacao_em),
          responsavel_ultima_atualizacao = CASE WHEN $11::text = '__G3_KEEP__' THEN responsavel_ultima_atualizacao ELSE $11 END,
          usuario_execucao = CASE WHEN $12::text = '__G3_KEEP__' THEN usuario_execucao ELSE $12 END,
          iniciado_em = CASE WHEN $13::timestamp IS NULL THEN iniciado_em ELSE $13 END,
          finalizado_em = CASE WHEN $14::timestamp IS NULL THEN finalizado_em ELSE $14 END,
          atualizado_em = NOW()
        WHERE id = 1
      `,
      input.versaoInstalada ?? null,
      input.versaoPublicada ?? null,
      input.atualizacaoDisponivel ?? null,
      input.emExecucao ?? null,
      input.status ?? null,
      input.mensagem === undefined ? "__G3_KEEP__" : input.mensagem,
      input.progresso ?? null,
      input.execucaoId === undefined ? "__G3_KEEP__" : input.execucaoId,
      input.ultimaVerificacaoEm ?? null,
      input.ultimaAtualizacaoEm ?? null,
      input.responsavelUltimaAtualizacao === undefined
        ? "__G3_KEEP__"
        : input.responsavelUltimaAtualizacao,
      input.usuarioExecucao === undefined ? "__G3_KEEP__" : input.usuarioExecucao,
      input.iniciadoEm ?? null,
      input.finalizadoEm ?? null
    );

    return this.obterStatus();
  }

  async iniciarExecucao(input: {
    execucaoId: string;
    versaoInstalada: string;
    versaoPublicada?: string | null;
    mensagem: string;
    usuarioExecucao: string;
  }) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `
        UPDATE atualizacao_sistema_status
        SET
          em_execucao = TRUE,
          status = 'PROCESSANDO',
          mensagem = $1,
          progresso = 5,
          execucao_id = $2,
          usuario_execucao = $3,
          versao_instalada = $4,
          versao_publicada = COALESCE($5, versao_publicada),
          iniciado_em = NOW(),
          finalizado_em = NULL,
          atualizado_em = NOW()
        WHERE id = 1
          AND COALESCE(em_execucao, FALSE) = FALSE
        RETURNING id
      `,
      input.mensagem,
      input.execucaoId,
      input.usuarioExecucao,
      input.versaoInstalada,
      input.versaoPublicada ?? null
    );

    return rows.length > 0;
  }

  async finalizarExecucao(input: {
    execucaoId: string;
    status: string;
    mensagem: string;
    progresso: number;
    versaoInstalada?: string | null;
    versaoPublicada?: string | null;
    atualizacaoDisponivel?: boolean;
    usuarioExecucao?: string | null;
    responsavelUltimaAtualizacao?: string | null;
    registrarUltimaAtualizacao?: boolean;
  }) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        UPDATE atualizacao_sistema_status
        SET
          em_execucao = FALSE,
          status = $1,
          mensagem = $2,
          progresso = $3,
          versao_instalada = COALESCE($4, versao_instalada),
          versao_publicada = COALESCE($5, versao_publicada),
          atualizacao_disponivel = COALESCE($6, atualizacao_disponivel),
          usuario_execucao = COALESCE($7, usuario_execucao),
          responsavel_ultima_atualizacao = CASE WHEN $8::text = '__G3_KEEP__' THEN responsavel_ultima_atualizacao ELSE $8 END,
          ultima_atualizacao_em = CASE WHEN $9 THEN NOW() ELSE ultima_atualizacao_em END,
          execucao_id = $10,
          finalizado_em = NOW(),
          atualizado_em = NOW()
        WHERE id = 1 AND execucao_id = $11
      `,
      input.status,
      input.mensagem,
      input.progresso,
      input.versaoInstalada ?? null,
      input.versaoPublicada ?? null,
      input.atualizacaoDisponivel ?? null,
      input.usuarioExecucao ?? null,
      input.responsavelUltimaAtualizacao === undefined
        ? "__G3_KEEP__"
        : input.responsavelUltimaAtualizacao,
      Boolean(input.registrarUltimaAtualizacao),
      null,
      input.execucaoId
    );

    return this.obterStatus();
  }

  async registrarHistorico(input: {
    execucaoId: string;
    versaoAnterior?: string | null;
    versaoNova?: string | null;
    modo: AtualizacaoSistemaModo;
    usuarioResponsavel?: string | null;
    duracaoMs?: number | null;
    status: string;
    detalhes?: Record<string, unknown> | null;
    backupDiretorio?: string | null;
    rollbackDisponivel?: boolean;
  }) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO atualizacao_sistema_historico (
          execucao_id,
          versao_anterior,
          versao_nova,
          modo,
          usuario_responsavel,
          data_hora,
          duracao_ms,
          status,
          detalhes_json,
          backup_diretorio,
          rollback_disponivel
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8::jsonb, $9, $10)
      `,
      input.execucaoId,
      input.versaoAnterior ?? null,
      input.versaoNova ?? null,
      input.modo,
      input.usuarioResponsavel ?? null,
      input.duracaoMs ?? null,
      input.status,
      JSON.stringify(input.detalhes ?? {}),
      input.backupDiretorio ?? null,
      Boolean(input.rollbackDisponivel)
    );
  }

  async listarHistorico(limite = 50) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<RegistroHistoricoRow[]>(
      `
        SELECT
          id,
          execucao_id,
          versao_anterior,
          versao_nova,
          modo,
          usuario_responsavel,
          data_hora,
          duracao_ms,
          status,
          detalhes_json,
          backup_diretorio,
          rollback_disponivel,
          rollback_executado_em
        FROM atualizacao_sistema_historico
        ORDER BY data_hora DESC, id DESC
        LIMIT $1
      `,
      limite
    );

    return rows.map(toHistoricoResponse);
  }

  async buscarHistoricoParaRollback(historicoId?: string) {
    await this.ensureEstrutura();

    const filtro = historicoId?.trim()
      ? prisma.$queryRawUnsafe<RegistroHistoricoRow[]>(
          `
            SELECT
              id,
              execucao_id,
              versao_anterior,
              versao_nova,
              modo,
              usuario_responsavel,
              data_hora,
              duracao_ms,
              status,
              detalhes_json,
              backup_diretorio,
              rollback_disponivel,
              rollback_executado_em
            FROM atualizacao_sistema_historico
            WHERE id = $1::bigint
            LIMIT 1
          `,
          historicoId
        )
      : prisma.$queryRawUnsafe<RegistroHistoricoRow[]>(
          `
            SELECT
              id,
              execucao_id,
              versao_anterior,
              versao_nova,
              modo,
              usuario_responsavel,
              data_hora,
              duracao_ms,
              status,
              detalhes_json,
              backup_diretorio,
              rollback_disponivel,
              rollback_executado_em
            FROM atualizacao_sistema_historico
            WHERE status = 'CONCLUIDO'
              AND rollback_disponivel = TRUE
            ORDER BY data_hora DESC, id DESC
            LIMIT 1
          `
        );

    const rows = await filtro;
    return rows[0] ? toHistoricoResponse(rows[0]) : null;
  }

  async marcarRollbackExecutado(historicoId: string) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        UPDATE atualizacao_sistema_historico
        SET rollback_executado_em = NOW()
        WHERE id = $1::bigint
      `,
      historicoId
    );
  }

  async registrarLog(input: {
    execucaoId: string;
    nivel: "INFO" | "WARN" | "ERROR";
    etapa: string;
    mensagem: string;
    detalhes?: Record<string, unknown> | null;
  }) {
    await this.ensureEstrutura();

    await prisma.$executeRawUnsafe(
      `
        INSERT INTO atualizacao_sistema_logs (
          execucao_id,
          nivel,
          etapa,
          mensagem,
          detalhes_json,
          criado_em
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      `,
      input.execucaoId,
      input.nivel,
      input.etapa,
      input.mensagem,
      JSON.stringify(input.detalhes ?? {})
    );
  }

  async listarLogs(input?: { execucaoId?: string; limite?: number }) {
    await this.ensureEstrutura();
    const limite = Math.max(1, Math.min(200, Number(input?.limite ?? 100)));

    const rows = input?.execucaoId
      ? await prisma.$queryRawUnsafe<RegistroLogRow[]>(
          `
            SELECT id, execucao_id, nivel, etapa, mensagem, detalhes_json, criado_em
            FROM atualizacao_sistema_logs
            WHERE execucao_id = $1
            ORDER BY criado_em DESC, id DESC
            LIMIT $2
          `,
          input.execucaoId,
          limite
        )
      : await prisma.$queryRawUnsafe<RegistroLogRow[]>(
          `
            SELECT id, execucao_id, nivel, etapa, mensagem, detalhes_json, criado_em
            FROM atualizacao_sistema_logs
            ORDER BY criado_em DESC, id DESC
            LIMIT $1
          `,
          limite
        );

    return rows.map(toLogResponse);
  }
}

export async function ensureAtualizacaoSistemaEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const sql of sqlEstruturaAtualizacaoSistema) {
        await prisma.$executeRawUnsafe(sql);
      }
    })().catch((error) => {
      estruturaPromise = null;
      throw error;
    });
  }

  await estruturaPromise;
}
