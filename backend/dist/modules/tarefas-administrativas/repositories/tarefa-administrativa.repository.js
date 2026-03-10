import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
export class TarefaAdministrativaRepository {
    async listar() {
        const tarefas = await prisma.$queryRaw(Prisma.sql `
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
    async buscarPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
        if (!tarefa)
            return null;
        const checklist = await prisma.$queryRaw(Prisma.sql `
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
        const historico = await prisma.$queryRaw(Prisma.sql `
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
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro) {
            throw new AppError("Tarefa não encontrada.", 404);
        }
        return registro;
    }
    async criar(input) {
        const id = await prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
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
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
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
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM tarefas_pendencias_checklist
        WHERE tarefa_id = ${id}
      `);
            await this.salvarChecklist(tx, id, input.checklist ?? []);
            await this.inserirHistorico(tx, id, "Tarefa atualizada.");
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async adicionarHistorico(id, mensagem) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            await this.inserirHistorico(tx, id, mensagem);
            await tx.$executeRaw(Prisma.sql `
        UPDATE tarefas_pendencias
        SET atualizado_em = NOW()
        WHERE id = ${id}
      `);
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM tarefas_pendencias
      WHERE id = ${id}
    `);
    }
    async listarChecklist() {
        return prisma.$queryRaw(Prisma.sql `
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
    async listarHistorico() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tarefa_id,
        mensagem,
        criado_em
      FROM tarefas_pendencias_historico
      ORDER BY tarefa_id ASC, criado_em DESC, id DESC
    `);
    }
    async salvarChecklist(tx, tarefaId, checklist) {
        for (let index = 0; index < (checklist?.length ?? 0); index += 1) {
            const item = checklist?.[index];
            if (!item)
                continue;
            const titulo = trimOrUndefined(item.titulo);
            if (!titulo)
                continue;
            await tx.$executeRaw(Prisma.sql `
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
    async inserirHistorico(tx, tarefaId, mensagem) {
        const mensagemLimpa = trimOrUndefined(mensagem);
        if (!mensagemLimpa)
            return;
        await tx.$executeRaw(Prisma.sql `
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
