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
type TarefaResumoRow = {
  total_pendentes: bigint | number | null;
  total_em_atraso: bigint | number | null;
};

const estruturaSql = [
  "ALTER TABLE tarefas_pendencias ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS tarefas_pendencias_checklist ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS tarefas_pendencias_historico ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS tarefas_pendencias_tenant_idx ON tarefas_pendencias(tenant_id, atualizado_em DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS tarefas_pendencias_checklist_tenant_idx ON tarefas_pendencias_checklist(tenant_id, tarefa_id, ordem, id)",
  "CREATE INDEX IF NOT EXISTS tarefas_pendencias_historico_tenant_idx ON tarefas_pendencias_historico(tenant_id, tarefa_id, criado_em DESC)",
  `
    UPDATE tarefas_pendencias AS t
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE t.tenant_id IS NULL
  `,
  `
    UPDATE tarefas_pendencias_checklist AS c
    SET tenant_id = t.tenant_id
    FROM tarefas_pendencias t
    WHERE c.tenant_id IS NULL
      AND t.id = c.tarefa_id
      AND t.tenant_id IS NOT NULL
  `,
  `
    UPDATE tarefas_pendencias_historico AS h
    SET tenant_id = t.tenant_id
    FROM tarefas_pendencias t
    WHERE h.tenant_id IS NULL
      AND t.id = h.tarefa_id
      AND t.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class TarefaAdministrativaRepository {
  private async garantirEstrutura() {
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

  async listar(tenantId: string) {
    await this.garantirEstrutura();
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
      WHERE tenant_id::text = ${tenantId}
      ORDER BY atualizado_em DESC, id DESC
    `);

    const checklist = await this.listarChecklist(tenantId);
    const historico = await this.listarHistorico(tenantId);
    const checklistPorTarefa = new Map<string, TarefaAdministrativaChecklistRow[]>();
    const historicoPorTarefa = new Map<string, TarefaAdministrativaHistoricoRow[]>();

    checklist.forEach((item) => {
      const chave = item.tarefa_id.toString();
      const itens = checklistPorTarefa.get(chave);
      if (itens) {
        itens.push(item);
        return;
      }
      checklistPorTarefa.set(chave, [item]);
    });

    historico.forEach((item) => {
      const chave = item.tarefa_id.toString();
      const itens = historicoPorTarefa.get(chave);
      if (itens) {
        itens.push(item);
        return;
      }
      historicoPorTarefa.set(chave, [item]);
    });

    return tarefas.map((tarefa) => ({
      tarefa,
      checklist: checklistPorTarefa.get(tarefa.id.toString()) ?? [],
      historico: historicoPorTarefa.get(tarefa.id.toString()) ?? []
    }));
  }

  async obterResumo(tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<TarefaResumoRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Concluida')::BIGINT AS total_pendentes,
        COUNT(*) FILTER (
          WHERE status IS DISTINCT FROM 'Concluida'
            AND (
              COALESCE(status, '') = 'Em atraso'
              OR (prazo IS NOT NULL AND prazo < CURRENT_DATE)
            )
        )::BIGINT AS total_em_atraso
      FROM tarefas_pendencias
      WHERE tenant_id::text = ${tenantId}
    `);

    const row = rows[0];
    return {
      totalPendentes: Number(row?.total_pendentes ?? 0),
      totalEmAtraso: Number(row?.total_em_atraso ?? 0)
    };
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
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
        AND tenant_id::text = ${tenantId}
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
        AND tenant_id::text = ${tenantId}
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
        AND tenant_id::text = ${tenantId}
      ORDER BY criado_em DESC, id DESC
    `);

    return { tarefa, checklist, historico };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Tarefa nao encontrada.", 404);
    }
    return registro;
  }

  async criar(input: TarefaAdministrativaInput, tenantId: string) {
    await this.garantirEstrutura();
    const id = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO tarefas_pendencias (
          tenant_id,
          titulo,
          descricao,
          responsavel,
          prioridade,
          prazo,
          status,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
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
        throw new AppError("Nao foi possivel criar a tarefa.", 500);
      }

      await this.salvarChecklist(tx, tarefaId, input.checklist ?? [], tenantId);
      await this.inserirHistorico(tx, tarefaId, "Tarefa criada.", tenantId);

      return tarefaId;
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: TarefaAdministrativaInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

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
          AND tenant_id::text = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM tarefas_pendencias_checklist
        WHERE tarefa_id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.salvarChecklist(tx, id, input.checklist ?? [], tenantId);
      await this.inserirHistorico(tx, id, "Tarefa atualizada.", tenantId);
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async adicionarHistorico(id: bigint, mensagem: string, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$transaction(async (tx) => {
      await this.inserirHistorico(tx, id, mensagem, tenantId);
      await tx.$executeRaw(Prisma.sql`
        UPDATE tarefas_pendencias
        SET atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
    });
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM tarefas_pendencias
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  private async listarChecklist(tenantId: string) {
    return prisma.$queryRaw<TarefaAdministrativaChecklistRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        titulo,
        concluido,
        concluido_em,
        ordem
      FROM tarefas_pendencias_checklist
      WHERE tenant_id::text = ${tenantId}
      ORDER BY tarefa_id ASC, ordem ASC, id ASC
    `);
  }

  private async listarHistorico(tenantId: string) {
    return prisma.$queryRaw<TarefaAdministrativaHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        tarefa_id,
        mensagem,
        criado_em
      FROM tarefas_pendencias_historico
      WHERE tenant_id::text = ${tenantId}
      ORDER BY tarefa_id ASC, criado_em DESC, id DESC
    `);
  }

  private async salvarChecklist(
    tx: TransactionClient,
    tarefaId: bigint,
    checklist: TarefaAdministrativaInput["checklist"],
    tenantId: string
  ) {
    for (let index = 0; index < (checklist?.length ?? 0); index += 1) {
      const item = checklist?.[index];
      if (!item) continue;
      const titulo = trimOrUndefined(item.titulo);
      if (!titulo) continue;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO tarefas_pendencias_checklist (
          tenant_id,
          tarefa_id,
          titulo,
          concluido,
          concluido_em,
          ordem,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
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

  private async inserirHistorico(
    tx: TransactionClient,
    tarefaId: bigint,
    mensagem: string,
    tenantId: string
  ) {
    const mensagemLimpa = trimOrUndefined(mensagem);
    if (!mensagemLimpa) return;

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO tarefas_pendencias_historico (
        tenant_id,
        tarefa_id,
        mensagem,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${tarefaId},
        ${mensagemLimpa},
        NOW()
      )
    `);
  }
}
