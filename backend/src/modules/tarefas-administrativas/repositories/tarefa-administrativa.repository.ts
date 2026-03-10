import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  TarefaAdministrativaInput,
  TarefaAdministrativaChecklistRow,
  TarefaAdministrativaHistoricoRow,
  TarefaAdministrativaRow
} from "../tarefa-administrativa.types.js";

type TransactionClient = Prisma.TransactionClient;

export class TarefaAdministrativaRepository {
  async listar() {
    const tarefas = await prisma.$queryRaw<TarefaAdministrativaRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        responsavel,
        prioridade,
        prazo,
        status,
        criado_em,
        atualizado_em
      FROM tarefas_pendencias
      ORDER BY atualizado_em DESC, id DESC
    `);

    const checklist = await this.listarChecklist();
    const historico = await this.listarHistorico();

    return tarefas.map((tarefa) => ({
      tarefa,
      checklist: checklist.filter((item) => item.tarefa_id === tarefa.id),
      historico: historico.filter((item) => item.tarefa_id === tarefa.id)
    }));
  }

  async buscarPorId(id: bigint) {
    const rows = await prisma.$queryRaw<TarefaAdministrativaRow[]>(Prisma.sql`
      SELECT
        id,
        titulo,
        descricao,
        responsavel,
        prioridade,
        prazo,
        status,
        criado_em,
        atualizado_em
      FROM tarefas_pendencias
      WHERE id = ${id}
      LIMIT 1
    `);

    const tarefa = rows[0];
    if (!tarefa) return null;

    const checklist = await prisma.$queryRaw<TarefaAdministrativaChecklistRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        titulo,
        concluido,
        concluido_em,
        ordem
      FROM tarefas_pendencias_checklist
      WHERE tarefa_id = ${id}
      ORDER BY ordem ASC, id ASC
    `);

    const historico = await prisma.$queryRaw<TarefaAdministrativaHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        mensagem,
        criado_em
      FROM tarefas_pendencias_historico
      WHERE tarefa_id = ${id}
      ORDER BY criado_em DESC, id DESC
    `);

    return { tarefa, checklist, historico };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Tarefa não encontrada.", 404);
    }
    return registro;
  }

  async criar(input: TarefaAdministrativaInput) {
    const id = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO tarefas_pendencias (
          titulo,
          descricao,
          responsavel,
          prioridade,
          prazo,
          status,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.titulo},
          ${input.descricao},
          ${input.responsavel},
          ${input.prioridade},
          ${toOptionalDate(input.prazo)},
          ${input.status},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const tarefaId = inserted[0]?.id;
      if (!tarefaId) {
        throw new AppError("Não foi possível criar a tarefa.", 500);
      }

      await this.salvarChecklist(tx, tarefaId, input.checklist ?? []);
      await this.inserirHistorico(tx, tarefaId, "Tarefa criada.");

      return tarefaId;
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: TarefaAdministrativaInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE tarefas_pendencias
        SET
          titulo = ${input.titulo},
          descricao = ${input.descricao},
          responsavel = ${input.responsavel},
          prioridade = ${input.prioridade},
          prazo = ${toOptionalDate(input.prazo)},
          status = ${input.status},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM tarefas_pendencias_checklist
        WHERE tarefa_id = ${id}
      `);

      await this.salvarChecklist(tx, id, input.checklist ?? []);
      await this.inserirHistorico(tx, id, "Tarefa atualizada.");
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async adicionarHistorico(id: bigint, mensagem: string) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$transaction(async (tx) => {
      await this.inserirHistorico(tx, id, mensagem);
      await tx.$executeRaw(Prisma.sql`
        UPDATE tarefas_pendencias
        SET atualizado_em = NOW()
        WHERE id = ${id}
      `);
    });
    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM tarefas_pendencias
      WHERE id = ${id}
    `);
  }

  private async listarChecklist() {
    return prisma.$queryRaw<TarefaAdministrativaChecklistRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        titulo,
        concluido,
        concluido_em,
        ordem
      FROM tarefas_pendencias_checklist
      ORDER BY tarefa_id ASC, ordem ASC, id ASC
    `);
  }

  private async listarHistorico() {
    return prisma.$queryRaw<TarefaAdministrativaHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        mensagem,
        criado_em
      FROM tarefas_pendencias_historico
      ORDER BY tarefa_id ASC, criado_em DESC, id DESC
    `);
  }

  private async salvarChecklist(
    tx: TransactionClient,
    tarefaId: bigint,
    checklist: TarefaAdministrativaInput["checklist"]
  ) {
    for (let index = 0; index < (checklist?.length ?? 0); index += 1) {
      const item = checklist?.[index];
      if (!item) continue;
      const titulo = trimOrUndefined(item.titulo);
      if (!titulo) continue;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO tarefas_pendencias_checklist (
          tarefa_id,
          titulo,
          concluido,
          concluido_em,
          ordem,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tarefaId},
          ${titulo},
          ${!!item.concluido},
          ${item.concluido ? new Date(item.concluidoEm ?? new Date().toISOString()) : null},
          ${item.ordem ?? index},
          NOW(),
          NOW()
        )
      `);
    }
  }

  private async inserirHistorico(tx: TransactionClient, tarefaId: bigint, mensagem: string) {
    const mensagemLimpa = trimOrUndefined(mensagem);
    if (!mensagemLimpa) return;

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO tarefas_pendencias_historico (
        tarefa_id,
        mensagem,
        criado_em
      ) VALUES (
        ${tarefaId},
        ${mensagemLimpa},
        NOW()
      )
    `);
  }
}
