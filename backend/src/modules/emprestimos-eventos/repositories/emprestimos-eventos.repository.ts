import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { trimOrUndefined } from "../../../utils/string-utils.js";
import {
  adicionarDiasLocal,
  calcularDiaDevolucaoApoio,
  calcularDiaRetiradaApoio,
  formatDateLocal,
  formatDateTimeLocal,
  inicioDoDiaLocal,
  parseDateTimeLocal
} from "../emprestimos-eventos-datetime.js";
import type {
  EmprestimoEventoFiltros,
  EmprestimoEventoInput,
  EmprestimoEventoItemInput,
  EmprestimoEventoItemRow,
  EmprestimoEventoMovimentacaoRow,
  EmprestimoEventoRow,
  EventoEmprestimoInput,
  EventoEmprestimoRow,
  ResponsavelEmprestimoInput,
  ResponsavelEmprestimoRow,
  StatusEmprestimoEvento,
  TipoItemEmprestimo
} from "../emprestimos-eventos.types.js";

type TransactionClient = Prisma.TransactionClient;

function toOptionalDateTime(value?: string | null) {
  const text = trimOrUndefined(value);
  if (!text) return undefined;
  const parsed = parseDateTimeLocal(text);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    throw new AppError("Data e hora invalida.", 400);
  }
  return parsed;
}

function toDbNullableText(value?: string | null) {
  return trimOrUndefined(value ?? undefined) ?? null;
}

function overlapSql(
  inicio: Date,
  fim: Date,
  aliasInicio = "e.data_retirada_prevista",
  aliasFim = "e.data_devolucao_prevista"
) {
  return Prisma.sql`(
    ${inicio} <= ${Prisma.raw(aliasFim)}
    AND ${fim} >= ${Prisma.raw(aliasInicio)}
  )`;
}

function tenantSql(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

const estruturaSql = [
  "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(200)",
  "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS responsavel_cadastro_id BIGINT",
  "ALTER TABLE IF EXISTS emprestimos_eventos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS eventos_emprestimos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS eventos_emprestimos ADD COLUMN IF NOT EXISTS promovido_por VARCHAR(200)",
  "ALTER TABLE IF EXISTS eventos_emprestimos ALTER COLUMN data_inicio DROP NOT NULL",
  "ALTER TABLE IF EXISTS eventos_emprestimos ALTER COLUMN data_fim DROP NOT NULL",
  "ALTER TABLE IF EXISTS emprestimos_eventos_itens ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS emprestimos_eventos_movimentacoes ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `CREATE TABLE IF NOT EXISTS emprestimos_eventos_responsaveis (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      nome VARCHAR(200) NOT NULL,
      documento VARCHAR(40),
      telefone VARCHAR(40),
      email VARCHAR(160),
      observacoes TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  "ALTER TABLE IF EXISTS emprestimos_eventos_responsaveis ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS emprestimos_eventos_tenant_idx ON emprestimos_eventos(tenant_id, data_retirada_prevista DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS eventos_emprestimos_tenant_idx ON eventos_emprestimos(tenant_id, data_inicio DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS emprestimos_eventos_itens_tenant_idx ON emprestimos_eventos_itens(tenant_id, emprestimo_id, item_id)",
  "CREATE INDEX IF NOT EXISTS emprestimos_eventos_movimentacoes_tenant_idx ON emprestimos_eventos_movimentacoes(tenant_id, emprestimo_id, criado_em DESC)",
  "CREATE INDEX IF NOT EXISTS emprestimos_eventos_responsaveis_nome_idx ON emprestimos_eventos_responsaveis(tenant_id, nome)",
  `
    UPDATE eventos_emprestimos AS ev
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE ev.tenant_id IS NULL
  `,
  `
    UPDATE emprestimos_eventos_responsaveis AS r
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE r.tenant_id IS NULL
  `,
  `
    UPDATE emprestimos_eventos AS e
    SET tenant_id = COALESCE(
      (
        SELECT ev.tenant_id
        FROM eventos_emprestimos ev
        WHERE ev.id = e.evento_id
        LIMIT 1
      ),
      (
        SELECT r.tenant_id
        FROM emprestimos_eventos_responsaveis r
        WHERE r.id = e.responsavel_cadastro_id
        LIMIT 1
      ),
      ref.tenant_id
    )
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE e.tenant_id IS NULL
  `,
  `
    UPDATE emprestimos_eventos_itens AS i
    SET tenant_id = e.tenant_id
    FROM emprestimos_eventos e
    WHERE i.tenant_id IS NULL
      AND e.id = i.emprestimo_id
      AND e.tenant_id IS NOT NULL
  `,
  `
    UPDATE emprestimos_eventos_movimentacoes AS m
    SET tenant_id = e.tenant_id
    FROM emprestimos_eventos e
    WHERE m.tenant_id IS NULL
      AND e.id = m.emprestimo_id
      AND e.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class EmprestimosEventosRepository {
  private async ensureEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        for (const sql of estruturaSql) {
          await prisma.$executeRawUnsafe(sql);
        }
      })().catch((error) => {
        estruturaPromise = null;
        throw error;
      });
    }

    await estruturaPromise;
  }

  async listarEmprestimos(filtros: EmprestimoEventoFiltros, tenantId: string) {
    await this.ensureEstrutura();
    const where: Prisma.Sql[] = [tenantSql("e", tenantId), tenantSql("ev", tenantId)];

    const inicio = toOptionalDateTime(filtros.inicio);
    if (inicio) {
      where.push(Prisma.sql`e.data_retirada_prevista >= ${inicio}`);
    }

    const fim = toOptionalDateTime(filtros.fim);
    if (fim) {
      where.push(Prisma.sql`e.data_devolucao_prevista <= ${fim}`);
    }

    const status = trimOrUndefined(filtros.status);
    if (status) {
      where.push(Prisma.sql`e.status = ${status}`);
    }

    const evento = Number(filtros.evento);
    if (Number.isInteger(evento) && evento > 0) {
      where.push(Prisma.sql`e.evento_id = ${BigInt(evento)}`);
    }

    const unidade = Number(filtros.unidade);
    if (Number.isInteger(unidade) && unidade > 0) {
      where.push(Prisma.sql`e.unidade_id = ${BigInt(unidade)}`);
    }

    const item = Number(filtros.item);
    if (Number.isInteger(item) && item > 0) {
      where.push(
        Prisma.sql`EXISTS (
          SELECT 1
          FROM emprestimos_eventos_itens i2
          WHERE i2.emprestimo_id = e.id
            AND i2.item_id = ${BigInt(item)}
            AND i2.tenant_id::text = ${tenantId}
        )`
      );
    }

    const whereClause = Prisma.join(where, " AND ");

    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        COALESCE(e.responsavel_cadastro_id, e.responsavel_id) AS responsavel_id,
        e.responsavel_nome AS responsavel_nome_livre,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.promovido_por AS evento_promovido_por,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(r.nome, NULLIF(TRIM(e.responsavel_nome), ''), u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev
        ON ev.id = e.evento_id
       AND ev.tenant_id::text = ${tenantId}
      LEFT JOIN emprestimos_eventos_responsaveis r
        ON r.id = e.responsavel_cadastro_id
       AND r.tenant_id::text = ${tenantId}
      LEFT JOIN usuarios u
        ON u.id = e.responsavel_id
       AND u.tenant_id::text = ${tenantId}
      WHERE ${whereClause}
      ORDER BY e.data_retirada_prevista DESC, e.id DESC
    `);

    if (!registros.length) return [];
    const itens = await this.listarItensPorEmprestimos(registros.map((item) => item.id), tenantId);

    return registros.map((registro) => ({
      registro,
      itens: itens.filter((item) => item.emprestimo_id === registro.id)
    }));
  }

  async buscarEmprestimoPorId(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        COALESCE(e.responsavel_cadastro_id, e.responsavel_id) AS responsavel_id,
        e.responsavel_nome AS responsavel_nome_livre,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.promovido_por AS evento_promovido_por,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(r.nome, NULLIF(TRIM(e.responsavel_nome), ''), u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev
        ON ev.id = e.evento_id
       AND ev.tenant_id::text = ${tenantId}
      LEFT JOIN emprestimos_eventos_responsaveis r
        ON r.id = e.responsavel_cadastro_id
       AND r.tenant_id::text = ${tenantId}
      LEFT JOIN usuarios u
        ON u.id = e.responsavel_id
       AND u.tenant_id::text = ${tenantId}
      WHERE e.id = ${id}
        AND e.tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const registro = registros[0];
    if (!registro) return null;

    const itens = await this.listarItensPorEmprestimos([id], tenantId);
    return {
      registro,
      itens
    };
  }

  async buscarEmprestimoPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarEmprestimoPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Emprestimo de evento nao encontrado.", 404);
    }
    return registro;
  }

  async criarEmprestimo(input: EmprestimoEventoInput, tenantId: string) {
    await this.ensureEstrutura();
    const id = await prisma.$transaction(async (tx) => {
      await this.validarEventoExiste(tx, input.eventoId, tenantId);
      if (input.responsavelId) {
        await this.validarResponsavelExiste(tx, input.responsavelId, tenantId);
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO emprestimos_eventos (
          tenant_id,
          evento_id,
          unidade_id,
          responsavel_id,
          responsavel_cadastro_id,
          responsavel_nome,
          data_retirada_prevista,
          data_devolucao_prevista,
          data_retirada_real,
          data_devolucao_real,
          status,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${BigInt(input.eventoId)},
          ${input.unidadeId ? BigInt(input.unidadeId) : null},
          ${null},
          ${input.responsavelId ? BigInt(input.responsavelId) : null},
          ${trimOrUndefined(input.responsavelNome ?? undefined)},
          ${toOptionalDateTime(input.dataRetiradaPrevista)},
          ${toOptionalDateTime(input.dataDevolucaoPrevista)},
          ${toOptionalDateTime(input.dataRetiradaReal)},
          ${toOptionalDateTime(input.dataDevolucaoReal)},
          ${input.status},
          ${trimOrUndefined(input.observacoes ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const emprestimoId = inserted[0]?.id;
      if (!emprestimoId) {
        throw new AppError("Nao foi possivel criar o emprestimo.", 500);
      }

      await this.validarItensEmprestimo(tx, input.itens ?? [], {
        dataRetiradaPrevista: input.dataRetiradaPrevista,
        dataDevolucaoPrevista: input.dataDevolucaoPrevista
      }, tenantId);
      await this.salvarItens(tx, emprestimoId, input.itens ?? [], tenantId);
      await this.registrarMovimentacao(
        tx,
        emprestimoId,
        "CRIACAO",
        "Emprestimo criado.",
        tenantId
      );

      return emprestimoId;
    });

    return this.buscarEmprestimoPorIdOuFalhar(id, tenantId);
  }

  async atualizarEmprestimo(id: bigint, input: EmprestimoEventoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarEmprestimoPorIdOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      await this.validarEventoExiste(tx, input.eventoId, tenantId);
      if (input.responsavelId) {
        await this.validarResponsavelExiste(tx, input.responsavelId, tenantId);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE emprestimos_eventos
        SET
          evento_id = ${BigInt(input.eventoId)},
          unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null},
          responsavel_id = ${null},
          responsavel_cadastro_id = ${input.responsavelId ? BigInt(input.responsavelId) : null},
          responsavel_nome = ${trimOrUndefined(input.responsavelNome ?? undefined)},
          data_retirada_prevista = ${toOptionalDateTime(input.dataRetiradaPrevista)},
          data_devolucao_prevista = ${toOptionalDateTime(input.dataDevolucaoPrevista)},
          data_retirada_real = ${toOptionalDateTime(input.dataRetiradaReal)},
          data_devolucao_real = ${toOptionalDateTime(input.dataDevolucaoReal)},
          status = ${input.status},
          observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM emprestimos_eventos_itens
        WHERE emprestimo_id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.validarItensEmprestimo(tx, input.itens ?? [], {
        dataRetiradaPrevista: input.dataRetiradaPrevista,
        dataDevolucaoPrevista: input.dataDevolucaoPrevista,
        emprestimoId: Number(id)
      }, tenantId);
      await this.salvarItens(tx, id, input.itens ?? [], tenantId);
      await this.registrarMovimentacao(
        tx,
        id,
        "ATUALIZACAO",
        "Emprestimo atualizado.",
        tenantId
      );
    });

    return this.buscarEmprestimoPorIdOuFalhar(id, tenantId);
  }

  async removerEmprestimo(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarEmprestimoPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM emprestimos_eventos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async alterarStatus(
    id: bigint,
    status: StatusEmprestimoEvento,
    tenantId: string,
    usuarioId?: number
  ) {
    await this.ensureEstrutura();
    const atual = await this.buscarEmprestimoPorIdOuFalhar(id, tenantId);
    this.validarTransicaoStatus(atual.registro.status as StatusEmprestimoEvento, status);

    await prisma.$transaction(async (tx) => {
      const camposAtualizacao: Prisma.Sql[] = [
        Prisma.sql`status = ${status}`,
        Prisma.sql`atualizado_em = NOW()`
      ];

      if (status === "RETIRADO") {
        camposAtualizacao.push(Prisma.sql`data_retirada_real = NOW()`);
      }

      if (status === "DEVOLVIDO") {
        camposAtualizacao.push(Prisma.sql`data_devolucao_real = NOW()`);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE emprestimos_eventos
        SET ${Prisma.join(camposAtualizacao, ", ")}
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarMovimentacao(
        tx,
        id,
        `STATUS_${status}`,
        `Status alterado para ${status}.`,
        tenantId,
        usuarioId
      );
    });

    return this.buscarEmprestimoPorIdOuFalhar(id, tenantId);
  }

  async listarEventos(tenantId: string) {
    await this.ensureEstrutura();
    return prisma.$queryRaw<EventoEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        local,
        promovido_por,
        data_inicio,
        data_fim,
        status
      FROM eventos_emprestimos
      WHERE tenant_id::text = ${tenantId}
      ORDER BY data_inicio DESC, id DESC
    `);
  }

  async listarResponsaveis(tenantId: string) {
    await this.ensureEstrutura();
    return prisma.$queryRaw<ResponsavelEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        documento,
        telefone,
        email,
        observacoes,
        criado_em,
        atualizado_em
      FROM emprestimos_eventos_responsaveis
      WHERE tenant_id::text = ${tenantId}
      ORDER BY nome ASC, id ASC
    `);
  }

  async buscarResponsavelPorId(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<ResponsavelEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        documento,
        telefone,
        email,
        observacoes,
        criado_em,
        atualizado_em
      FROM emprestimos_eventos_responsaveis
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async criarResponsavel(input: ResponsavelEmprestimoInput, tenantId: string) {
    await this.ensureEstrutura();
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO emprestimos_eventos_responsaveis (
        tenant_id,
        nome,
        documento,
        telefone,
        email,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.nome},
        ${trimOrUndefined(input.documento ?? undefined)},
        ${trimOrUndefined(input.telefone ?? undefined)},
        ${trimOrUndefined(input.email ?? undefined)},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar o responsavel.", 500);
    }

    const responsavel = await this.buscarResponsavelPorId(id, tenantId);
    if (!responsavel) {
      throw new AppError("Responsavel nao encontrado apos criacao.", 500);
    }
    return responsavel;
  }

  async atualizarResponsavel(id: bigint, input: ResponsavelEmprestimoInput, tenantId: string) {
    await this.ensureEstrutura();
    const atual = await this.buscarResponsavelPorId(id, tenantId);
    if (!atual) {
      throw new AppError("Responsavel nao encontrado.", 404);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE emprestimos_eventos_responsaveis
      SET
        nome = ${input.nome},
        documento = ${trimOrUndefined(input.documento ?? undefined)},
        telefone = ${trimOrUndefined(input.telefone ?? undefined)},
        email = ${trimOrUndefined(input.email ?? undefined)},
        observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const responsavel = await this.buscarResponsavelPorId(id, tenantId);
    if (!responsavel) {
      throw new AppError("Responsavel nao encontrado apos atualizacao.", 500);
    }
    return responsavel;
  }

  async excluirResponsavel(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const atual = await this.buscarResponsavelPorId(id, tenantId);
    if (!atual) {
      throw new AppError("Responsavel nao encontrado.", 404);
    }

    const emprestimoVinculado = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM emprestimos_eventos
      WHERE responsavel_cadastro_id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    if (emprestimoVinculado.length) {
      throw new AppError("Nao e possivel excluir responsavel vinculado a emprestimos.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM emprestimos_eventos_responsaveis
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async buscarEventoPorId(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<EventoEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        local,
        promovido_por,
        data_inicio,
        data_fim,
        status
      FROM eventos_emprestimos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async criarEvento(input: EventoEmprestimoInput, tenantId: string) {
    await this.ensureEstrutura();
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO eventos_emprestimos (
        tenant_id,
        titulo,
        descricao,
        local,
        promovido_por,
        data_inicio,
        data_fim,
        status,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.titulo},
        ${toDbNullableText(input.descricao)},
        ${toDbNullableText(input.local)},
        ${toDbNullableText(input.promovidoPor)},
        ${toOptionalDateTime(input.dataInicio)},
        ${toOptionalDateTime(input.dataFim)},
        ${toDbNullableText(input.status) ?? "PLANEJADO"},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel criar o evento.", 500);
    const evento = await this.buscarEventoPorId(id, tenantId);
    if (!evento) throw new AppError("Evento nao encontrado apos criacao.", 500);
    return evento;
  }

  async atualizarEvento(id: bigint, input: EventoEmprestimoInput, tenantId: string) {
    await this.ensureEstrutura();
    const atual = await this.buscarEventoPorId(id, tenantId);
    if (!atual) {
      throw new AppError("Evento nao encontrado.", 404);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE eventos_emprestimos
      SET
        titulo = ${input.titulo},
        descricao = ${toDbNullableText(input.descricao)},
        local = ${toDbNullableText(input.local)},
        promovido_por = ${toDbNullableText(input.promovidoPor)},
        data_inicio = ${toOptionalDateTime(input.dataInicio)},
        data_fim = ${toOptionalDateTime(input.dataFim)},
        status = ${toDbNullableText(input.status) ?? atual.status},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    const evento = await this.buscarEventoPorId(id, tenantId);
    if (!evento) throw new AppError("Evento nao encontrado apos atualizacao.", 500);
    return evento;
  }

  async excluirEvento(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const evento = await this.buscarEventoPorId(id, tenantId);
    if (!evento) {
      throw new AppError("Evento nao encontrado.", 404);
    }

    const emprestimos = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM emprestimos_eventos
      WHERE evento_id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (emprestimos.length) {
      throw new AppError("Nao e possivel excluir evento com emprestimos vinculados.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM eventos_emprestimos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarAgendaResumo(inicio: Date, fim: Date, tenantId: string) {
    await this.ensureEstrutura();
    const inicioConsulta = adicionarDiasLocal(inicio, -1);
    const fimConsulta = adicionarDiasLocal(fim, 14);
    const feriados = await this.listarFeriadosPeriodo(inicioConsulta, fimConsulta);
    const emprestimos = await prisma.$queryRaw<
      Array<{ id: bigint; inicio: Date; fim: Date; status: string }>
    >(Prisma.sql`
      SELECT
        id,
        data_retirada_prevista AS inicio,
        data_devolucao_prevista AS fim,
        status
      FROM emprestimos_eventos
      WHERE tenant_id::text = ${tenantId}
        AND status <> 'CANCELADO'
        AND ${overlapSql(inicioConsulta, fimConsulta, "data_retirada_prevista", "data_devolucao_prevista")}
      ORDER BY data_retirada_prevista ASC
    `);

    const resultado = new Map<
      string,
      {
        data: string;
        temBloqueio: boolean;
        temApoio: boolean;
        qtdEmprestimos: number;
        qtdApoios: number;
        emprestimoIds: number[];
      }
    >();

    const registrarDia = (
      data: Date,
      tipo: "EVENTO" | "APOIO",
      registro: { id: bigint; status: string }
    ) => {
      const dia = formatDateLocal(data) ?? "";
      if (!dia || dia < formatDateLocal(inicio)! || dia > formatDateLocal(fim)!) return;
      const atual = resultado.get(dia) ?? {
        data: dia,
        temBloqueio: false,
        temApoio: false,
        qtdEmprestimos: 0,
        qtdApoios: 0,
        emprestimoIds: []
      };

      if (tipo === "EVENTO") {
        atual.qtdEmprestimos += 1;
        atual.temBloqueio = atual.temBloqueio || registro.status !== "DEVOLVIDO";
      } else {
        atual.qtdApoios += 1;
        atual.temApoio = true;
      }
      atual.emprestimoIds.push(Number(registro.id));
      resultado.set(dia, atual);
    };

    for (const registro of emprestimos) {
      const retiradaApoio = calcularDiaRetiradaApoio(registro.inicio);
      const devolucaoApoio = calcularDiaDevolucaoApoio(registro.fim, feriados);
      registrarDia(retiradaApoio, "APOIO", registro);
      registrarDia(devolucaoApoio, "APOIO", registro);

      const primeiroDia = inicioDoDiaLocal(registro.inicio > inicio ? registro.inicio : inicio);
      const ultimoDia = inicioDoDiaLocal(registro.fim < fim ? registro.fim : fim);

      for (const dataAtual = new Date(primeiroDia); dataAtual <= ultimoDia; dataAtual.setDate(dataAtual.getDate() + 1)) {
        registrarDia(dataAtual, "EVENTO", registro);
      }
    }

    return [...resultado.values()].sort((a, b) => a.data.localeCompare(b.data));
  }

  async listarAgendaDia(data: Date, tenantId: string) {
    await this.ensureEstrutura();
    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);
    const feriados = await this.listarFeriadosPeriodo(adicionarDiasLocal(data, -14), adicionarDiasLocal(data, 14));

    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        COALESCE(e.responsavel_cadastro_id, e.responsavel_id) AS responsavel_id,
        e.responsavel_nome AS responsavel_nome_livre,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.promovido_por AS evento_promovido_por,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(r.nome, NULLIF(TRIM(e.responsavel_nome), ''), u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev
        ON ev.id = e.evento_id
       AND ev.tenant_id::text = ${tenantId}
      LEFT JOIN emprestimos_eventos_responsaveis r
        ON r.id = e.responsavel_cadastro_id
       AND r.tenant_id::text = ${tenantId}
      LEFT JOIN usuarios u
        ON u.id = e.responsavel_id
       AND u.tenant_id::text = ${tenantId}
      WHERE e.tenant_id::text = ${tenantId}
        AND e.status <> 'CANCELADO'
        AND (
          ${overlapSql(inicioDia, fimDia, "e.data_retirada_prevista", "e.data_devolucao_prevista")}
          OR DATE(e.data_retirada_prevista) = CAST(${formatDateLocal(adicionarDiasLocal(data, 1))} AS DATE)
          OR DATE(e.data_devolucao_prevista) BETWEEN CAST(${formatDateLocal(adicionarDiasLocal(data, -14))} AS DATE) AND CAST(${formatDateLocal(adicionarDiasLocal(data, -1))} AS DATE)
        )
      ORDER BY e.data_retirada_prevista ASC, e.id ASC
    `);

    const registrosDoDia = registros.filter((registro) => {
      const diaSelecionado = formatDateLocal(inicioDia);
      const inicioEvento = inicioDoDiaLocal(registro.data_retirada_prevista);
      const fimEvento = inicioDoDiaLocal(registro.data_devolucao_prevista);
      const retiradaApoio = calcularDiaRetiradaApoio(inicioEvento);
      const devolucaoApoio = calcularDiaDevolucaoApoio(fimEvento, feriados);
      const dia = diaSelecionado ?? "";
      return (
        (formatDateLocal(inicioEvento)! <= dia && formatDateLocal(fimEvento)! >= dia) ||
        formatDateLocal(retiradaApoio) === dia ||
        formatDateLocal(devolucaoApoio) === dia
      );
    });

    if (!registrosDoDia.length) return [];
    const itens = await this.listarItensPorEmprestimos(registrosDoDia.map((item) => item.id), tenantId);
    return registrosDoDia.map((registro) => {
      const diaSelecionado = formatDateLocal(inicioDia);
      const inicioEvento = inicioDoDiaLocal(registro.data_retirada_prevista);
      const fimEvento = inicioDoDiaLocal(registro.data_devolucao_prevista);
      const retiradaApoio = calcularDiaRetiradaApoio(inicioEvento);
      const devolucaoApoio = calcularDiaDevolucaoApoio(fimEvento, feriados);
      const dia = diaSelecionado ?? "";
      const tipoDia =
        formatDateLocal(retiradaApoio) === dia
          ? "RETIRADA"
          : formatDateLocal(devolucaoApoio) === dia
            ? "DEVOLUCAO"
            : "EVENTO";
      return {
        registro,
        tipoDia,
        apoio: {
          retirada: retiradaApoio,
          eventoInicio: inicioEvento,
          eventoFim: fimEvento,
          devolucao: devolucaoApoio
        },
        itens: itens.filter((item) => item.emprestimo_id === registro.id)
      };
    });
  }

  async consultarDisponibilidade(
    input: {
      itemId: number;
      tipoItem: TipoItemEmprestimo;
      quantidade?: number;
      inicio: Date;
      fim: Date;
      emprestimoId?: number;
    },
    tenantId: string
  ) {
    await this.ensureEstrutura();
    const conflitos = await prisma.$queryRaw<
      Array<{
        emprestimo_id: bigint;
        evento_titulo: string;
        inicio: Date;
        fim: Date;
        status: string;
        quantidade_reservada: number;
      }>
    >(Prisma.sql`
      SELECT
        e.id AS emprestimo_id,
        ev.titulo AS evento_titulo,
        e.data_retirada_prevista AS inicio,
        e.data_devolucao_prevista AS fim,
        e.status,
        i.quantidade AS quantidade_reservada
      FROM emprestimos_eventos_itens i
      INNER JOIN emprestimos_eventos e
        ON e.id = i.emprestimo_id
       AND e.tenant_id::text = ${tenantId}
      INNER JOIN eventos_emprestimos ev
        ON ev.id = e.evento_id
       AND ev.tenant_id::text = ${tenantId}
      WHERE i.item_id = ${BigInt(input.itemId)}
        AND i.tipo_item = ${input.tipoItem}
        AND i.tenant_id::text = ${tenantId}
        AND e.status <> 'CANCELADO'
        ${input.emprestimoId ? Prisma.sql`AND e.id <> ${BigInt(input.emprestimoId)}` : Prisma.empty}
        AND ${overlapSql(input.inicio, input.fim, "e.data_retirada_prevista", "e.data_devolucao_prevista")}
      ORDER BY e.data_retirada_prevista ASC
    `);

    const quantidadeSolicitada = input.quantidade ?? 1;
    const quantidadeReservada = conflitos
      .filter((item) => item.status !== "DEVOLVIDO")
      .reduce((acc, item) => acc + Number(item.quantidade_reservada), 0);

    let quantidadeDisponivel: number | null = null;

    if (input.tipoItem === "ALMOXARIFADO") {
      const rows = await prisma.$queryRaw<Array<{ estoque_atual: number }>>(Prisma.sql`
        SELECT estoque_atual
        FROM almoxarifado_item
        WHERE id = ${BigInt(input.itemId)}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      if (!rows.length) {
        throw new AppError("Item de almoxarifado nao encontrado.", 404);
      }
      quantidadeDisponivel = Math.max(0, Number(rows[0].estoque_atual) - quantidadeReservada);
    } else {
      const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM patrimonio_item
        WHERE id = ${BigInt(input.itemId)}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      if (!rows.length) {
        throw new AppError("Item de patrimonio nao encontrado.", 404);
      }
      quantidadeDisponivel = Math.max(0, 1 - quantidadeReservada);
    }

    return {
      disponivel: quantidadeDisponivel >= quantidadeSolicitada,
      quantidadeDisponivel,
      conflitos: conflitos.map((item) => ({
        emprestimoId: Number(item.emprestimo_id),
        eventoTitulo: item.evento_titulo,
        inicio: formatDateTimeLocal(item.inicio),
        fim: formatDateTimeLocal(item.fim),
        status: item.status,
        quantidadeReservada: Number(item.quantidade_reservada)
      }))
    };
  }

  async listarMovimentacoes(emprestimoId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarEmprestimoPorIdOuFalhar(emprestimoId, tenantId);
    return prisma.$queryRaw<EmprestimoEventoMovimentacaoRow[]>(Prisma.sql`
      SELECT
        id,
        emprestimo_id,
        acao,
        descricao,
        usuario_id,
        criado_em
      FROM emprestimos_eventos_movimentacoes
      WHERE emprestimo_id = ${emprestimoId}
        AND tenant_id::text = ${tenantId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async obterNomeInstituicao(tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<Array<{ nome: string | null }>>(Prisma.sql`
      SELECT COALESCE(NULLIF(TRIM(nome_fantasia), ''), NULLIF(TRIM(razao_social), '')) AS nome
      FROM instituicoes
      WHERE tenant_id::text = ${tenantId}
      ORDER BY criado_em ASC
      LIMIT 1
    `);
    return rows[0]?.nome?.trim() || "Instituição";
  }

  private async validarEventoExiste(tx: TransactionClient, eventoId: number, tenantId: string) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM eventos_emprestimos
      WHERE id = ${BigInt(eventoId)}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (!rows.length) {
      throw new AppError("Evento nao encontrado para emprestimo.", 404);
    }
  }

  private async validarResponsavelExiste(
    tx: TransactionClient,
    responsavelId: number,
    tenantId: string
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM emprestimos_eventos_responsaveis
      WHERE id = ${BigInt(responsavelId)}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (!rows.length) {
      throw new AppError("Responsavel nao encontrado para emprestimo.", 404);
    }
  }

  private async listarItensPorEmprestimos(emprestimoIds: bigint[], tenantId: string) {
    if (!emprestimoIds.length) return [];
    return prisma.$queryRaw<EmprestimoEventoItemRow[]>(Prisma.sql`
      SELECT
        i.id,
        i.emprestimo_id,
        i.item_id,
        i.tipo_item,
        i.quantidade,
        i.status_item,
        i.observacao_item,
        CASE
          WHEN i.tipo_item = 'PATRIMONIO' THEN p.nome
          ELSE a.descricao
        END AS nome_item,
        p.numero_patrimonio
      FROM emprestimos_eventos_itens i
      LEFT JOIN patrimonio_item p
        ON p.id = i.item_id
       AND i.tipo_item = 'PATRIMONIO'
       AND p.tenant_id::text = ${tenantId}
      LEFT JOIN almoxarifado_item a
        ON a.id = i.item_id
       AND i.tipo_item = 'ALMOXARIFADO'
       AND a.tenant_id::text = ${tenantId}
      WHERE i.emprestimo_id IN (${Prisma.join(emprestimoIds)})
        AND i.tenant_id::text = ${tenantId}
      ORDER BY i.id ASC
    `);
  }

  private async salvarItens(
    tx: TransactionClient,
    emprestimoId: bigint,
    itens: EmprestimoEventoItemInput[],
    tenantId: string
  ) {
    for (const item of itens) {
      await this.validarItemExiste(tx, item.itemId, item.tipoItem, tenantId);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO emprestimos_eventos_itens (
          tenant_id,
          emprestimo_id,
          item_id,
          tipo_item,
          quantidade,
          status_item,
          observacao_item,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${emprestimoId},
          ${BigInt(item.itemId)},
          ${item.tipoItem},
          ${item.quantidade},
          ${trimOrUndefined(item.statusItem ?? undefined) ?? "RESERVADO"},
          ${trimOrUndefined(item.observacaoItem ?? undefined)},
          NOW(),
          NOW()
        )
      `);
    }
  }

  private async listarFeriadosPeriodo(inicio: Date, fim: Date) {
    const rows = await prisma.$queryRaw<Array<{ data: Date }>>(Prisma.sql`
      SELECT data
      FROM feriados
      WHERE data BETWEEN ${inicioDoDiaLocal(inicio)} AND ${inicioDoDiaLocal(fim)}
    `);
    return new Set(rows.map((item) => formatDateLocal(item.data) ?? "").filter(Boolean));
  }

  private async validarItensEmprestimo(
    tx: TransactionClient,
    itens: EmprestimoEventoItemInput[],
    contexto: {
      dataRetiradaPrevista: string;
      dataDevolucaoPrevista: string;
      emprestimoId?: number;
    },
    tenantId: string
  ) {
    const agrupados = new Map<string, EmprestimoEventoItemInput>();

    for (const item of itens) {
      const chave = `${item.tipoItem}:${item.itemId}`;
      const atual = agrupados.get(chave);
      if (atual) {
        atual.quantidade += item.quantidade;
        atual.observacaoItem = [atual.observacaoItem, item.observacaoItem].filter(Boolean).join(" | ");
        continue;
      }
      agrupados.set(chave, { ...item });
    }

    const inicio = toOptionalDateTime(contexto.dataRetiradaPrevista);
    const fim = toOptionalDateTime(contexto.dataDevolucaoPrevista);
    if (!inicio || !fim) {
      throw new AppError("Periodo do emprestimo invalido.", 400);
    }

    for (const item of agrupados.values()) {
      await this.validarItemExiste(tx, item.itemId, item.tipoItem, tenantId);
      const disponibilidade = await this.consultarDisponibilidade(
        {
          itemId: item.itemId,
          tipoItem: item.tipoItem,
          quantidade: item.quantidade,
          inicio,
          fim,
          emprestimoId: contexto.emprestimoId
        },
        tenantId
      );

      if (!disponibilidade.disponivel) {
        throw new AppError(
          `Item indisponivel para o periodo informado: ${item.tipoItem} ${item.itemId}.`,
          409
        );
      }
    }
  }

  private async validarItemExiste(
    tx: TransactionClient,
    itemId: number,
    tipoItem: TipoItemEmprestimo,
    tenantId: string
  ) {
    if (tipoItem === "PATRIMONIO") {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM patrimonio_item
        WHERE id = ${BigInt(itemId)}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      if (!rows.length) {
        throw new AppError("Patrimonio nao encontrado para emprestimo.", 400);
      }
      return;
    }

    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM almoxarifado_item
      WHERE id = ${BigInt(itemId)}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (!rows.length) {
      throw new AppError("Item de almoxarifado nao encontrado para emprestimo.", 400);
    }
  }

  private async registrarMovimentacao(
    tx: TransactionClient,
    emprestimoId: bigint,
    acao: string,
    descricao: string | undefined,
    tenantId: string,
    usuarioId?: number
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO emprestimos_eventos_movimentacoes (
        tenant_id,
        emprestimo_id,
        acao,
        descricao,
        usuario_id,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${emprestimoId},
        ${acao},
        ${trimOrUndefined(descricao)},
        ${usuarioId ? BigInt(usuarioId) : null},
        NOW()
      )
    `);
  }

  private validarTransicaoStatus(
    statusAtual: StatusEmprestimoEvento,
    proximoStatus: StatusEmprestimoEvento
  ) {
    if (statusAtual === proximoStatus) {
      throw new AppError("O emprestimo ja esta com este status.", 409);
    }

    if (proximoStatus === "RETIRADO" && ["DEVOLVIDO", "CANCELADO"].includes(statusAtual)) {
      throw new AppError("Nao e possivel confirmar retirada para emprestimo devolvido ou cancelado.", 409);
    }

    if (proximoStatus === "DEVOLVIDO" && statusAtual !== "RETIRADO") {
      throw new AppError("A devolucao so pode ser confirmada apos a retirada.", 409);
    }

    if (proximoStatus === "CANCELADO" && ["DEVOLVIDO", "CANCELADO"].includes(statusAtual)) {
      throw new AppError("Nao e possivel cancelar emprestimo devolvido ou ja cancelado.", 409);
    }
  }
}
