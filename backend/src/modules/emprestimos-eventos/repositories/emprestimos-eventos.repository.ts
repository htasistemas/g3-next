import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  EmprestimoEventoFiltros,
  EmprestimoEventoInput,
  EmprestimoEventoItemInput,
  EmprestimoEventoItemRow,
  EmprestimoEventoMovimentacaoRow,
  EmprestimoEventoRow,
  EventoEmprestimoInput,
  EventoEmprestimoRow,
  StatusEmprestimoEvento,
  TipoItemEmprestimo
} from "../emprestimos-eventos.types.js";

type TransactionClient = Prisma.TransactionClient;

function toOptionalDateTime(value?: string | null) {
  const text = trimOrUndefined(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("Data e hora invalida.", 400);
  }
  return parsed;
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

export class EmprestimosEventosRepository {
  async listarEmprestimos(filtros: EmprestimoEventoFiltros) {
    const where: Prisma.Sql[] = [];

    const inicio = toOptionalDateTime(filtros.inicio);
    if (inicio) {
      where.push(Prisma.sql`AND e.data_retirada_prevista >= ${inicio}`);
    }

    const fim = toOptionalDateTime(filtros.fim);
    if (fim) {
      where.push(Prisma.sql`AND e.data_devolucao_prevista <= ${fim}`);
    }

    const status = trimOrUndefined(filtros.status);
    if (status) {
      where.push(Prisma.sql`AND e.status = ${status}`);
    }

    const evento = Number(filtros.evento);
    if (Number.isInteger(evento) && evento > 0) {
      where.push(Prisma.sql`AND e.evento_id = ${BigInt(evento)}`);
    }

    const unidade = Number(filtros.unidade);
    if (Number.isInteger(unidade) && unidade > 0) {
      where.push(Prisma.sql`AND e.unidade_id = ${BigInt(unidade)}`);
    }

    const item = Number(filtros.item);
    if (Number.isInteger(item) && item > 0) {
      where.push(
        Prisma.sql`AND EXISTS (
          SELECT 1
          FROM emprestimos_eventos_itens i2
          WHERE i2.emprestimo_id = e.id
            AND i2.item_id = ${BigInt(item)}
        )`
      );
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        e.responsavel_id,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev ON ev.id = e.evento_id
      LEFT JOIN usuarios u ON u.id = e.responsavel_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY e.data_retirada_prevista DESC, e.id DESC
    `);

    if (!registros.length) return [];
    const itens = await this.listarItensPorEmprestimos(registros.map((item) => item.id));

    return registros.map((registro) => ({
      registro,
      itens: itens.filter((item) => item.emprestimo_id === registro.id)
    }));
  }

  async buscarEmprestimoPorId(id: bigint) {
    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        e.responsavel_id,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev ON ev.id = e.evento_id
      LEFT JOIN usuarios u ON u.id = e.responsavel_id
      WHERE e.id = ${id}
      LIMIT 1
    `);

    const registro = registros[0];
    if (!registro) return null;

    const itens = await this.listarItensPorEmprestimos([id]);
    return {
      registro,
      itens
    };
  }

  async buscarEmprestimoPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarEmprestimoPorId(id);
    if (!registro) {
      throw new AppError("Emprestimo de evento nao encontrado.", 404);
    }
    return registro;
  }

  async criarEmprestimo(input: EmprestimoEventoInput) {
    const id = await prisma.$transaction(async (tx) => {
      await this.validarEventoExiste(tx, input.eventoId);

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO emprestimos_eventos (
          evento_id,
          unidade_id,
          responsavel_id,
          data_retirada_prevista,
          data_devolucao_prevista,
          data_retirada_real,
          data_devolucao_real,
          status,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          ${BigInt(input.eventoId)},
          ${input.unidadeId ? BigInt(input.unidadeId) : null},
          ${input.responsavelId ? BigInt(input.responsavelId) : null},
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

      await this.salvarItens(tx, emprestimoId, input.itens ?? []);
      await this.registrarMovimentacao(
        tx,
        emprestimoId,
        "CRIACAO",
        "Emprestimo criado."
      );

      return emprestimoId;
    });

    return this.buscarEmprestimoPorIdOuFalhar(id);
  }

  async atualizarEmprestimo(id: bigint, input: EmprestimoEventoInput) {
    await this.buscarEmprestimoPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await this.validarEventoExiste(tx, input.eventoId);

      await tx.$executeRaw(Prisma.sql`
        UPDATE emprestimos_eventos
        SET
          evento_id = ${BigInt(input.eventoId)},
          unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null},
          responsavel_id = ${input.responsavelId ? BigInt(input.responsavelId) : null},
          data_retirada_prevista = ${toOptionalDateTime(input.dataRetiradaPrevista)},
          data_devolucao_prevista = ${toOptionalDateTime(input.dataDevolucaoPrevista)},
          data_retirada_real = ${toOptionalDateTime(input.dataRetiradaReal)},
          data_devolucao_real = ${toOptionalDateTime(input.dataDevolucaoReal)},
          status = ${input.status},
          observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM emprestimos_eventos_itens
        WHERE emprestimo_id = ${id}
      `);

      await this.salvarItens(tx, id, input.itens ?? []);
      await this.registrarMovimentacao(
        tx,
        id,
        "ATUALIZACAO",
        "Emprestimo atualizado."
      );
    });

    return this.buscarEmprestimoPorIdOuFalhar(id);
  }

  async removerEmprestimo(id: bigint) {
    await this.buscarEmprestimoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM emprestimos_eventos
      WHERE id = ${id}
    `);
  }

  async alterarStatus(
    id: bigint,
    status: StatusEmprestimoEvento,
    usuarioId?: number
  ) {
    await this.buscarEmprestimoPorIdOuFalhar(id);

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
      `);

      await this.registrarMovimentacao(
        tx,
        id,
        `STATUS_${status}`,
        `Status alterado para ${status}.`,
        usuarioId
      );
    });

    return this.buscarEmprestimoPorIdOuFalhar(id);
  }

  async listarEventos() {
    return prisma.$queryRaw<EventoEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        local,
        data_inicio,
        data_fim,
        status
      FROM eventos_emprestimos
      ORDER BY data_inicio DESC, id DESC
    `);
  }

  async buscarEventoPorId(id: bigint) {
    const rows = await prisma.$queryRaw<EventoEmprestimoRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        local,
        data_inicio,
        data_fim,
        status
      FROM eventos_emprestimos
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async criarEvento(input: EventoEmprestimoInput) {
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO eventos_emprestimos (
        titulo,
        descricao,
        local,
        data_inicio,
        data_fim,
        status,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.titulo},
        ${trimOrUndefined(input.descricao ?? undefined)},
        ${trimOrUndefined(input.local ?? undefined)},
        ${toOptionalDateTime(input.dataInicio)},
        ${toOptionalDateTime(input.dataFim)},
        ${trimOrUndefined(input.status ?? undefined) ?? "PLANEJADO"},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel criar o evento.", 500);
    const evento = await this.buscarEventoPorId(id);
    if (!evento) throw new AppError("Evento nao encontrado apos criacao.", 500);
    return evento;
  }

  async atualizarEvento(id: bigint, input: EventoEmprestimoInput) {
    const atual = await this.buscarEventoPorId(id);
    if (!atual) {
      throw new AppError("Evento nao encontrado.", 404);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE eventos_emprestimos
      SET
        titulo = ${input.titulo},
        descricao = ${trimOrUndefined(input.descricao ?? undefined)},
        local = ${trimOrUndefined(input.local ?? undefined)},
        data_inicio = ${toOptionalDateTime(input.dataInicio)},
        data_fim = ${toOptionalDateTime(input.dataFim)},
        status = ${trimOrUndefined(input.status ?? undefined) ?? atual.status},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);

    const evento = await this.buscarEventoPorId(id);
    if (!evento) throw new AppError("Evento nao encontrado apos atualizacao.", 500);
    return evento;
  }

  async excluirEvento(id: bigint) {
    const evento = await this.buscarEventoPorId(id);
    if (!evento) {
      throw new AppError("Evento nao encontrado.", 404);
    }

    const emprestimos = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM emprestimos_eventos
      WHERE evento_id = ${id}
      LIMIT 1
    `);
    if (emprestimos.length) {
      throw new AppError("Nao e possivel excluir evento com emprestimos vinculados.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM eventos_emprestimos
      WHERE id = ${id}
    `);
  }

  async listarAgendaResumo(inicio: Date, fim: Date) {
    const emprestimos = await prisma.$queryRaw<
      Array<{ id: bigint; inicio: Date; fim: Date; status: string }>
    >(Prisma.sql`
      SELECT
        id,
        data_retirada_prevista AS inicio,
        data_devolucao_prevista AS fim,
        status
      FROM emprestimos_eventos
      WHERE ${overlapSql(inicio, fim, "data_retirada_prevista", "data_devolucao_prevista")}
      ORDER BY data_retirada_prevista ASC
    `);

    const resultado = new Map<
      string,
      { data: string; temBloqueio: boolean; qtdEmprestimos: number; emprestimoIds: number[] }
    >();

    for (const registro of emprestimos) {
      const dia = registro.inicio.toISOString().slice(0, 10);
      const atual = resultado.get(dia) ?? {
        data: dia,
        temBloqueio: false,
        qtdEmprestimos: 0,
        emprestimoIds: []
      };

      atual.qtdEmprestimos += 1;
      atual.temBloqueio = atual.temBloqueio || registro.status === "RETIRADO";
      atual.emprestimoIds.push(Number(registro.id));
      resultado.set(dia, atual);
    }

    return [...resultado.values()].sort((a, b) => a.data.localeCompare(b.data));
  }

  async listarAgendaDia(data: Date) {
    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    const registros = await prisma.$queryRaw<EmprestimoEventoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.evento_id,
        e.unidade_id,
        e.responsavel_id,
        e.data_retirada_prevista,
        e.data_devolucao_prevista,
        e.data_retirada_real,
        e.data_devolucao_real,
        e.status,
        e.observacoes,
        ev.titulo AS evento_titulo,
        ev.descricao AS evento_descricao,
        ev.local AS evento_local,
        ev.data_inicio AS evento_data_inicio,
        ev.data_fim AS evento_data_fim,
        ev.status AS evento_status,
        COALESCE(u.nome_usuario, u.nome) AS responsavel_nome
      FROM emprestimos_eventos e
      INNER JOIN eventos_emprestimos ev ON ev.id = e.evento_id
      LEFT JOIN usuarios u ON u.id = e.responsavel_id
      WHERE ${overlapSql(inicioDia, fimDia, "e.data_retirada_prevista", "e.data_devolucao_prevista")}
      ORDER BY e.data_retirada_prevista ASC, e.id ASC
    `);

    if (!registros.length) return [];
    const itens = await this.listarItensPorEmprestimos(registros.map((item) => item.id));
    return registros.map((registro) => ({
      registro,
      itens: itens.filter((item) => item.emprestimo_id === registro.id)
    }));
  }

  async consultarDisponibilidade(input: {
    itemId: number;
    tipoItem: TipoItemEmprestimo;
    quantidade?: number;
    inicio: Date;
    fim: Date;
    emprestimoId?: number;
  }) {
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
      INNER JOIN emprestimos_eventos e ON e.id = i.emprestimo_id
      INNER JOIN eventos_emprestimos ev ON ev.id = e.evento_id
      WHERE i.item_id = ${BigInt(input.itemId)}
        AND i.tipo_item = ${input.tipoItem}
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
        inicio: item.inicio.toISOString(),
        fim: item.fim.toISOString(),
        status: item.status,
        quantidadeReservada: Number(item.quantidade_reservada)
      }))
    };
  }

  async listarMovimentacoes(emprestimoId: bigint) {
    await this.buscarEmprestimoPorIdOuFalhar(emprestimoId);
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
      ORDER BY criado_em DESC, id DESC
    `);
  }

  private async validarEventoExiste(tx: TransactionClient, eventoId: number) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM eventos_emprestimos
      WHERE id = ${BigInt(eventoId)}
      LIMIT 1
    `);
    if (!rows.length) {
      throw new AppError("Evento nao encontrado para emprestimo.", 404);
    }
  }

  private async listarItensPorEmprestimos(emprestimoIds: bigint[]) {
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
      LEFT JOIN patrimonio_item p ON p.id = i.item_id AND i.tipo_item = 'PATRIMONIO'
      LEFT JOIN almoxarifado_item a ON a.id = i.item_id AND i.tipo_item = 'ALMOXARIFADO'
      WHERE i.emprestimo_id IN (${Prisma.join(emprestimoIds)})
      ORDER BY i.id ASC
    `);
  }

  private async salvarItens(
    tx: TransactionClient,
    emprestimoId: bigint,
    itens: EmprestimoEventoItemInput[]
  ) {
    for (const item of itens) {
      await this.validarItemExiste(tx, item.itemId, item.tipoItem);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO emprestimos_eventos_itens (
          emprestimo_id,
          item_id,
          tipo_item,
          quantidade,
          status_item,
          observacao_item,
          criado_em,
          atualizado_em
        ) VALUES (
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

  private async validarItemExiste(
    tx: TransactionClient,
    itemId: number,
    tipoItem: TipoItemEmprestimo
  ) {
    if (tipoItem === "PATRIMONIO") {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM patrimonio_item
        WHERE id = ${BigInt(itemId)}
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
    descricao?: string,
    usuarioId?: number
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO emprestimos_eventos_movimentacoes (
        emprestimo_id,
        acao,
        descricao,
        usuario_id,
        criado_em
      ) VALUES (
        ${emprestimoId},
        ${acao},
        ${trimOrUndefined(descricao)},
        ${usuarioId ? BigInt(usuarioId) : null},
        NOW()
      )
    `);
  }
}
